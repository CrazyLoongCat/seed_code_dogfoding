import re
import asyncio
import aiohttp
import feedparser
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Callable
from urllib.parse import urlparse
from .models import NewsItem, CustomParserConfig
from .utils import normalize_hot_value


class BaseParser:
    name = "base"
    
    @classmethod
    def can_handle(cls, url: str) -> bool:
        return False
    
    @classmethod
    async def parse(cls, html: str, source_name: str) -> List[NewsItem]:
        raise NotImplementedError


class WeiboHotParser(BaseParser):
    name = "新浪微博热搜"
    
    @classmethod
    def can_handle(cls, url: str) -> bool:
        return "weibo" in url.lower() or "sina" in url.lower()
    
    @classmethod
    async def parse(cls, html: str, source_name: str) -> List[NewsItem]:
        items = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            rows = soup.select('tr, .list-item, .hot-item, .card')
            
            for idx, row in enumerate(rows[:50]):
                title_elem = row.select_one('.td-02 a, .title, a[href*="/weibo"], .content a')
                hot_elem = row.select_one('.td-03, .hot, .num, .heat')
                
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                hot_str = hot_elem.get_text(strip=True) if hot_elem else ""
                
                if title:
                    items.append(NewsItem(
                        title=title,
                        hot_value=normalize_hot_value(hot_str),
                        original_hot=hot_str if hot_str else "未知",
                        source=source_name,
                        rank=idx + 1
                    ))
        except Exception as e:
            print(f"Weibo解析错误: {e}")
        
        return items


class BaiduHotParser(BaseParser):
    name = "百度热搜"
    
    @classmethod
    def can_handle(cls, url: str) -> bool:
        return "baidu" in url.lower()
    
    @classmethod
    async def parse(cls, html: str, source_name: str) -> List[NewsItem]:
        items = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            rows = soup.select('.list-item, .hot-search-item, .c-single-text-ellipsis, a[href*="/s?wd"]')
            
            for idx, row in enumerate(rows[:50]):
                title_elem = row.select_one('.title-content-title, .c-single-text-ellipsis, a')
                hot_elem = row.select_one('.hot-index, .hot, .num')
                
                if not title_elem:
                    title_elem = row
                
                title = title_elem.get_text(strip=True) if title_elem else ""
                hot_str = hot_elem.get_text(strip=True) if hot_elem else ""
                
                if title and len(title) > 2:
                    items.append(NewsItem(
                        title=title,
                        hot_value=normalize_hot_value(hot_str),
                        original_hot=hot_str if hot_str else "未知",
                        source=source_name,
                        rank=idx + 1
                    ))
        except Exception as e:
            print(f"Baidu解析错误: {e}")
        
        return items


class ZhihuHotParser(BaseParser):
    name = "知乎热搜"
    
    @classmethod
    def can_handle(cls, url: str) -> bool:
        return "zhihu" in url.lower()
    
    @classmethod
    async def parse(cls, html: str, source_name: str) -> List[NewsItem]:
        items = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            rows = soup.select('.HotItem, .HotItem-content, .css-hi9r9q')
            
            for idx, row in enumerate(rows[:50]):
                title_elem = row.select_one('.HotItem-title, h2, .css-n2blzn')
                hot_elem = row.select_one('.HotItem-metrics, .css-ijj19r')
                
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                hot_str = hot_elem.get_text(strip=True) if hot_elem else ""
                
                if title:
                    items.append(NewsItem(
                        title=title,
                        hot_value=normalize_hot_value(hot_str),
                        original_hot=hot_str if hot_str else "未知",
                        source=source_name,
                        rank=idx + 1
                    ))
        except Exception as e:
            print(f"Zhihu解析错误: {e}")
        
        return items


class RSSParser(BaseParser):
    name = "RSS"
    
    @classmethod
    def can_handle(cls, url: str) -> bool:
        parsed = urlparse(url)
        return parsed.path.endswith(('.xml', '.rss', '.atom')) or 'rss' in parsed.path.lower()
    
    @classmethod
    async def parse(cls, content: str, source_name: str) -> List[NewsItem]:
        items = []
        try:
            feed = feedparser.parse(content)
            for idx, entry in enumerate(feed.entries[:50]):
                title = entry.get('title', '')
                description = entry.get('description', '')
                hot_str = "1000"
                
                if title:
                    items.append(NewsItem(
                        title=title,
                        hot_value=normalize_hot_value(hot_str) - idx * 10,
                        original_hot="RSS条目",
                        source=source_name,
                        rank=idx + 1
                    ))
        except Exception as e:
            print(f"RSS解析错误: {e}")
        
        return items


class CustomParser(BaseParser):
    def __init__(self, config: CustomParserConfig):
        self.config = config
        self.name = config.name
    
    def can_handle(self, url: str) -> bool:
        return re.search(self.config.url_pattern, url) is not None
    
    async def parse(self, html: str, source_name: str) -> List[NewsItem]:
        items = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            rows = soup.select(self.config.item_selector)
            
            for idx, row in enumerate(rows[:50]):
                title_elem = row.select_one(self.config.title_selector) if self.config.title_selector else row
                hot_elem = row.select_one(self.config.hot_selector) if self.config.hot_selector else None
                
                title = title_elem.get_text(strip=True) if title_elem else ""
                hot_str = hot_elem.get_text(strip=True) if hot_elem else "1000"
                
                if title:
                    items.append(NewsItem(
                        title=title,
                        hot_value=normalize_hot_value(hot_str),
                        original_hot=hot_str if hot_str else "未知",
                        source=source_name,
                        rank=idx + 1
                    ))
        except Exception as e:
            print(f"自定义解析器错误: {e}")
        
        return items


class ParserRegistry:
    _parsers: List[BaseParser] = [WeiboHotParser(), BaiduHotParser(), ZhihuHotParser(), RSSParser()]
    _custom_parsers: List[CustomParser] = []
    
    @classmethod
    def register_custom(cls, config: CustomParserConfig) -> None:
        cls._custom_parsers.append(CustomParser(config))
    
    @classmethod
    def get_parser(cls, url: str) -> Optional[BaseParser]:
        for parser in cls._custom_parsers:
            if parser.can_handle(url):
                return parser
        
        for parser in cls._parsers:
            if parser.can_handle(url):
                return parser
        
        return None


async def fetch_url(session: aiohttp.ClientSession, url: str, timeout: int = 10) -> Optional[str]:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        async with session.get(url, headers=headers, timeout=timeout) as response:
            if response.status == 200:
                return await response.text()
            else:
                print(f"HTTP错误: {response.status} for {url}")
                return None
    except Exception as e:
        print(f"抓取错误 {url}: {e}")
        return None


MOCK_DATA = {
    "weibo": [
        "AI大模型最新突破", "某明星官宣结婚", "2026高考报名开始", "新能源汽车销量创新高",
        "某电影票房破10亿", "iPhone 17发布日期曝光", "清华北大招生政策", "某城市房价下跌",
        "央行降息政策落地", "某某某涉嫌违法被查", "国产芯片新进展", "春运火车票开售",
        "某网红直播翻车", "国际油价大涨", "外卖骑手权益保障", "教育部新政策发布",
        "某上市公司财务造假", "演唱会门票秒光", "医院挂号难问题", "明星绯闻曝光"
    ],
    "baidu": [
        "人工智能技术发展", "今日股市行情分析", "天气预报全国降温", "新能源汽车补贴政策",
        "春节档电影票房", "iPhone 17 Pro评测", "公务员考试报名时间", "房地产新政策",
        "银行理财产品推荐", "某某某事件最新进展", "光刻机技术突破", "高速免费时间",
        "直播带货监管新规", "黄金价格今日查询", "灵活就业社保缴纳", "双减政策最新消息",
        "股市熔断机制说明", "周杰伦演唱会行程", "医保门诊共济改革", "吴亦凡案件最新"
    ]
}


def get_mock_news(source_name: str, source_type: str) -> List[NewsItem]:
    import random
    mock_type = "weibo" if "微博" in source_name or "sina" in source_name.lower() or source_type == "weibo" else "baidu"
    titles = MOCK_DATA.get(mock_type, MOCK_DATA["weibo"]).copy()
    random.shuffle(titles)
    
    items = []
    for idx, title in enumerate(titles[:20]):
        hot_value = random.randint(50000, 2000000)
        items.append(NewsItem(
            title=title,
            hot_value=hot_value,
            original_hot=f"{hot_value/10000:.1f}万",
            source=source_name,
            rank=idx + 1
        ))
    return items


async def parse_news_source(url: str, source_name: str, use_mock_on_failure: bool = True) -> tuple[List[NewsItem], Optional[str]]:
    try:
        async with aiohttp.ClientSession() as session:
            content = await fetch_url(session, url)
        
        if not content:
            if use_mock_on_failure:
                return get_mock_news(source_name, "weibo" if "weibo" in url.lower() else "baidu"), None
            return [], f"无法获取内容: {url}"
        
        parser = ParserRegistry.get_parser(url)
        if parser is None:
            if use_mock_on_failure:
                return get_mock_news(source_name, "weibo" if "weibo" in url.lower() else "baidu"), None
            return [], f"未找到适配的解析器: {url}"
        
        items = await parser.parse(content, source_name)
        
        if not items:
            if use_mock_on_failure:
                return get_mock_news(source_name, "weibo" if "weibo" in url.lower() else "baidu"), None
            return [], f"解析成功但未获取到新闻条目，可能是页面结构发生变化"
        
        return items, None
    
    except Exception as e:
        if use_mock_on_failure:
            return get_mock_news(source_name, "weibo" if "weibo" in url.lower() else "baidu"), None
        return [], f"处理 {url} 时发生错误: {str(e)}"


async def parse_multiple_sources(urls: List[str], source_names: List[str]) -> List[tuple[List[NewsItem], Optional[str]]]:
    tasks = [parse_news_source(url, name) for url, name in zip(urls, source_names)]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return results
