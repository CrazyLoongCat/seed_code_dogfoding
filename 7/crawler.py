import asyncio
import hashlib
import logging
import urllib.robotparser
from urllib.parse import urljoin, urlparse
from typing import Optional
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

from config import Config
from database import NewsItem, NewsSource

logger = logging.getLogger(__name__)


@dataclass
class RawNews:
    title: str
    publish_time: str
    url: str
    content: str
    source_name: str = ""


class NewsCrawler:
    def __init__(self):
        self._robot_parsers: dict[str, urllib.robotparser.RobotFileParser] = {}
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
        )
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._client:
            await self._client.aclose()

    def _can_fetch(self, url: str, robots_url: str) -> bool:
        try:
            if robots_url not in self._robot_parsers:
                rp = urllib.robotparser.RobotFileParser()
                rp.set_url(robots_url)
                rp.read()
                self._robot_parsers[robots_url] = rp
            return self._robot_parsers[robots_url].can_fetch("*", url)
        except Exception as e:
            logger.warning(f"Failed to check robots.txt for {url}: {e}")
            return True

    def _get_headers(self) -> dict[str, str]:
        return {
            "User-Agent": Config.get_random_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
        }

    async def _fetch_page(self, url: str, robots_url: str) -> Optional[str]:
        if not self._can_fetch(url, robots_url):
            logger.warning(f"Robots.txt disallows fetching: {url}")
            return None

        if not self._client:
            raise RuntimeError("Crawler not initialized, use async with")

        delay = Config.get_request_delay()
        logger.info(f"Waiting {delay:.2f}s before fetching {url}")
        await asyncio.sleep(delay)

        try:
            response = await self._client.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.text
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            return None

    def _parse_news_list_generic(self, html: str, base_url: str) -> list[dict[str, str]]:
        soup = BeautifulSoup(html, "lxml")
        news_items: list[dict[str, str]] = []

        selectors = [
            {"item": ".news-list .news-item", "title": "h3 a", "time": ".time", "link": "h3 a"},
            {"item": ".article-list li", "title": ".title", "time": ".date", "link": "a"},
            {"item": "ul.news-list li", "title": "a", "time": ".pub-time", "link": "a"},
            {"item": ".news-item", "title": ".news-title", "time": ".news-time", "link": "a"},
            {"item": "article", "title": "h2 a", "time": "time", "link": "h2 a"},
            {"item": ".list-item", "title": "h3 a, .title a", "time": ".time, .date", "link": "a"},
            {"item": ".item", "title": "a.title", "time": ".pubtime", "link": "a.title"},
        ]

        for sel in selectors:
            items = soup.select(sel["item"])
            if items:
                for item in items:
                    try:
                        title_elem = item.select_one(sel["title"])
                        time_elem = item.select_one(sel["time"])
                        link_elem = item.select_one(sel["link"])

                        if not title_elem or not link_elem:
                            continue

                        title = title_elem.get_text(strip=True)
                        href = link_elem.get("href", "")
                        full_url = urljoin(base_url, href)
                        publish_time = time_elem.get_text(strip=True) if time_elem else ""

                        if title and full_url:
                            news_items.append({
                                "title": title,
                                "publish_time": publish_time,
                                "url": full_url,
                            })
                        if len(news_items) >= Config.MAX_NEWS_PER_RUN:
                            break
                    except Exception as e:
                        logger.debug(f"Error parsing news item: {e}")
                        continue
                if news_items:
                    break

        return news_items

    def _parse_news_list_with_selector(
        self, html: str, base_url: str, link_selector: str
    ) -> list[dict[str, str]]:
        soup = BeautifulSoup(html, "lxml")
        news_items: list[dict[str, str]] = []

        try:
            links = soup.select(link_selector)
            for link in links:
                href = link.get("href", "")
                title = link.get_text(strip=True)
                if href and title:
                    full_url = urljoin(base_url, href)
                    news_items.append({
                        "title": title,
                        "publish_time": "",
                        "url": full_url,
                    })
                if len(news_items) >= Config.MAX_NEWS_PER_RUN:
                    break
        except Exception as e:
            logger.warning(f"Error parsing with custom selector: {e}")
            return self._parse_news_list_generic(html, base_url)

        return news_items if news_items else self._parse_news_list_generic(html, base_url)

    def _parse_news_content(self, html: str, content_selector: str = "") -> str:
        soup = BeautifulSoup(html, "lxml")

        content_selectors = []
        if content_selector:
            content_selectors.extend([s.strip() for s in content_selector.split(",")])

        content_selectors.extend([
            ".article-content",
            ".news-content",
            ".content-body",
            "#article-body",
            ".article-body",
            ".post-content",
            "article .content",
            ".detail-content",
            "#artibody",
            ".article",
            ".content",
        ])

        content = ""
        for selector in content_selectors:
            elem = soup.select_one(selector)
            if elem:
                for tag in elem.select("script, style, iframe, aside, nav, footer, .ad, .advertisement"):
                    tag.decompose()
                content = elem.get_text(separator="\n", strip=True)
                break

        if not content:
            paragraphs = soup.find_all("p")
            if paragraphs:
                content = "\n".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20)

        return content

    def _parse_news_detail(
        self,
        html: str,
        title_selector: str = "",
        time_selector: str = "",
        content_selector: str = "",
    ) -> dict[str, str]:
        soup = BeautifulSoup(html, "lxml")
        result = {"title": "", "publish_time": "", "content": ""}

        if title_selector:
            for sel in [s.strip() for s in title_selector.split(",")]:
                title_elem = soup.select_one(sel)
                if title_elem:
                    result["title"] = title_elem.get_text(strip=True)
                    break

        if not result["title"]:
            title_elem = soup.find("h1")
            if title_elem:
                result["title"] = title_elem.get_text(strip=True)

        if time_selector:
            for sel in [s.strip() for s in time_selector.split(",")]:
                time_elem = soup.select_one(sel)
                if time_elem:
                    result["publish_time"] = time_elem.get_text(strip=True)
                    break

        if not result["publish_time"]:
            time_elem = soup.find("time")
            if time_elem:
                result["publish_time"] = time_elem.get_text(strip=True)

        result["content"] = self._parse_news_content(html, content_selector)

        return result

    @staticmethod
    def _generate_md5(title: str, publish_time: str) -> str:
        raw = f"{title.strip().lower()}|{publish_time.strip()}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    async def fetch_from_source(self, source: NewsSource) -> list[RawNews]:
        logger.info(f"Fetching from source: {source.name} ({source.category})")
        raw_news_list: list[RawNews] = []

        try:
            list_html = await self._fetch_page(source.list_url, source.robots_url)
            if not list_html:
                logger.error(f"Failed to fetch news list from {source.name}")
                return []

            base_url = f"{urlparse(source.list_url).scheme}://{urlparse(source.list_url).netloc}"

            if source.detail_url_selector:
                news_meta = self._parse_news_list_with_selector(
                    list_html, base_url, source.detail_url_selector
                )
            else:
                news_meta = self._parse_news_list_generic(list_html, base_url)

            logger.info(f"Found {len(news_meta)} news items from {source.name}")

            for meta in news_meta:
                detail_html = await self._fetch_page(meta["url"], source.robots_url)
                if not detail_html:
                    continue

                detail = self._parse_news_detail(
                    detail_html,
                    source.title_selector,
                    source.time_selector,
                    source.content_selector,
                )

                title = detail["title"] or meta["title"]
                publish_time = detail["publish_time"] or meta["publish_time"]
                content = detail["content"]

                if not title or not content:
                    logger.warning(f"Skipping news from {source.name}: missing title or content")
                    continue

                raw_news_list.append(RawNews(
                    title=title,
                    publish_time=publish_time,
                    url=meta["url"],
                    content=content,
                    source_name=source.name,
                ))

        except Exception as e:
            logger.error(f"Error fetching from {source.name}: {e}", exc_info=True)

        logger.info(f"Successfully fetched {len(raw_news_list)} news from {source.name}")
        return raw_news_list

    async def fetch_from_all_sources(self, sources: list[NewsSource]) -> list[RawNews]:
        all_news: list[RawNews] = []
        for source in sources:
            if not source.enabled:
                logger.info(f"Skipping disabled source: {source.name}")
                continue
            news = await self.fetch_from_source(source)
            all_news.extend(news)
        return all_news

    @staticmethod
    def raw_news_to_item(raw: RawNews) -> NewsItem:
        news_md5 = NewsCrawler._generate_md5(raw.title, raw.publish_time)
        return NewsItem(
            news_md5=news_md5,
            title=raw.title,
            publish_time=raw.publish_time,
            source_url=raw.url,
            raw_content=raw.content,
        )
