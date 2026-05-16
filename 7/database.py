import sqlite3
import json
import logging
from contextlib import contextmanager
from typing import Optional
from datetime import datetime

from config import Config

logger = logging.getLogger(__name__)

DEFAULT_NEWS_SOURCES = [
    {
        "name": "新浪财经",
        "category": "国内",
        "list_url": "https://finance.sina.com.cn/roll/index.d.html",
        "detail_url_selector": ".news-list li a",
        "title_selector": "h1",
        "time_selector": ".date, .time",
        "content_selector": ".article-content, #artibody",
        "robots_url": "https://finance.sina.com.cn/robots.txt",
        "enabled": 1,
        "priority": 1,
    },
    {
        "name": "财联社",
        "category": "国内",
        "list_url": "https://www.cls.cn/telegraph",
        "detail_url_selector": ".telegraph-list li a",
        "title_selector": "h1, .title",
        "time_selector": ".time, .publish-time",
        "content_selector": ".article-content, .detail-content",
        "robots_url": "https://www.cls.cn/robots.txt",
        "enabled": 1,
        "priority": 2,
    },
    {
        "name": "东方财富网",
        "category": "国内",
        "list_url": "https://finance.eastmoney.com/news/cgnjj.html",
        "detail_url_selector": ".newsList li a",
        "title_selector": "h1, .newsContent h1",
        "time_selector": ".time, .publish-time",
        "content_selector": ".newsContent, #ContentBody",
        "robots_url": "https://www.eastmoney.com/robots.txt",
        "enabled": 1,
        "priority": 3,
    },
    {
        "name": "华尔街见闻",
        "category": "国内",
        "list_url": "https://wallstreetcn.com/news/global",
        "detail_url_selector": ".article-list a",
        "title_selector": "h1, .title",
        "time_selector": ".meta-time, .time",
        "content_selector": ".article-content, .content",
        "robots_url": "https://wallstreetcn.com/robots.txt",
        "enabled": 1,
        "priority": 4,
    },
    {
        "name": "第一财经",
        "category": "国内",
        "list_url": "https://www.yicai.com/news",
        "detail_url_selector": ".news-list li a",
        "title_selector": "h1",
        "time_selector": ".time, .publish-time",
        "content_selector": ".article-content, #text",
        "robots_url": "https://www.yicai.com/robots.txt",
        "enabled": 0,
        "priority": 5,
    },
    {
        "name": "Reuters 路透社",
        "category": "国际",
        "list_url": "https://www.reuters.com/business",
        "detail_url_selector": ".story-collection a",
        "title_selector": "h1",
        "time_selector": "time, .date",
        "content_selector": ".article-body__content__17Yit, .article-content",
        "robots_url": "https://www.reuters.com/robots.txt",
        "enabled": 1,
        "priority": 6,
    },
    {
        "name": "Bloomberg 彭博社",
        "category": "国际",
        "list_url": "https://www.bloomberg.com/markets",
        "detail_url_selector": ".story-list a",
        "title_selector": "h1",
        "time_selector": "time, .published-at",
        "content_selector": ".body-content, .article-body",
        "robots_url": "https://www.bloomberg.com/robots.txt",
        "enabled": 0,
        "priority": 7,
    },
    {
        "name": "CNBC",
        "category": "国际",
        "list_url": "https://www.cnbc.com/world-economy",
        "detail_url_selector": ".Card-title a",
        "title_selector": "h1",
        "time_selector": "time, .published-timestamp",
        "content_selector": ".ArticleBody-articleBody, .group",
        "robots_url": "https://www.cnbc.com/robots.txt",
        "enabled": 1,
        "priority": 8,
    },
    {
        "name": "Financial Times",
        "category": "国际",
        "list_url": "https://www.ft.com/global-economy",
        "detail_url_selector": ".o-teaser__heading a",
        "title_selector": "h1",
        "time_selector": "time, .article-info__timestamp",
        "content_selector": ".article__content-body, .story-body",
        "robots_url": "https://www.ft.com/robots.txt",
        "enabled": 0,
        "priority": 9,
    },
    {
        "name": "Yahoo Finance",
        "category": "国际",
        "list_url": "https://finance.yahoo.com/topic/economy",
        "detail_url_selector": ".js-stream-content a",
        "title_selector": "h1",
        "time_selector": "time, .caas-attr-time-style",
        "content_selector": ".caas-body, .article-body",
        "robots_url": "https://finance.yahoo.com/robots.txt",
        "enabled": 1,
        "priority": 10,
    },
]


class NewsSource:
    def __init__(
        self,
        id: Optional[int] = None,
        name: str = "",
        category: str = "国内",
        list_url: str = "",
        detail_url_selector: str = "",
        title_selector: str = "",
        time_selector: str = "",
        content_selector: str = "",
        robots_url: str = "",
        enabled: int = 1,
        priority: int = 0,
        created_at: Optional[str] = None,
    ):
        self.id = id
        self.name = name
        self.category = category
        self.list_url = list_url
        self.detail_url_selector = detail_url_selector
        self.title_selector = title_selector
        self.time_selector = time_selector
        self.content_selector = content_selector
        self.robots_url = robots_url
        self.enabled = enabled
        self.priority = priority
        self.created_at = created_at or datetime.now().isoformat()


class NewsItem:
    def __init__(
        self,
        news_md5: str,
        title: str,
        publish_time: str,
        source_url: str,
        raw_content: str,
        ai_summary: Optional[str] = None,
        sentiment: Optional[str] = None,
        keywords: Optional[list[str]] = None,
        created_at: Optional[str] = None,
    ):
        self.news_md5 = news_md5
        self.title = title
        self.publish_time = publish_time
        self.source_url = source_url
        self.raw_content = raw_content
        self.ai_summary = ai_summary
        self.sentiment = sentiment
        self.keywords = keywords
        self.created_at = created_at or datetime.now().isoformat()


class DatabaseManager:
    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path
        self._init_database()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _init_database(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS financial_news (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    news_md5 TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    publish_time TEXT NOT NULL,
                    source_url TEXT NOT NULL,
                    raw_content TEXT NOT NULL,
                    ai_summary TEXT,
                    sentiment TEXT,
                    keywords TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS news_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    list_url TEXT NOT NULL,
                    detail_url_selector TEXT,
                    title_selector TEXT,
                    time_selector TEXT,
                    content_selector TEXT,
                    robots_url TEXT,
                    enabled INTEGER DEFAULT 1,
                    priority INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cursor.execute("SELECT COUNT(*) FROM news_sources")
            if cursor.fetchone()[0] == 0:
                for source in DEFAULT_NEWS_SOURCES:
                    cursor.execute(
                        """
                        INSERT INTO news_sources
                        (name, category, list_url, detail_url_selector, title_selector,
                         time_selector, content_selector, robots_url, enabled, priority)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            source["name"],
                            source["category"],
                            source["list_url"],
                            source["detail_url_selector"],
                            source["title_selector"],
                            source["time_selector"],
                            source["content_selector"],
                            source["robots_url"],
                            source["enabled"],
                            source["priority"],
                        ),
                    )
                logger.info(f"Initialized {len(DEFAULT_NEWS_SOURCES)} default news sources")

            logger.info("Database initialized successfully")

    def exists(self, news_md5: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM financial_news WHERE news_md5 = ?",
                (news_md5,)
            )
            return cursor.fetchone() is not None

    def insert_raw_news(self, item: NewsItem) -> bool:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO financial_news
                    (news_md5, title, publish_time, source_url, raw_content, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item.news_md5,
                        item.title,
                        item.publish_time,
                        item.source_url,
                        item.raw_content,
                        item.created_at,
                    ),
                )
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to insert news {item.news_md5}: {e}")
            return False

    def update_ai_analysis(
        self,
        news_md5: str,
        ai_summary: str,
        sentiment: str,
        keywords: list[str],
    ) -> bool:
        try:
            keywords_json = json.dumps(keywords, ensure_ascii=False)
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE financial_news
                    SET ai_summary = ?, sentiment = ?, keywords = ?
                    WHERE news_md5 = ?
                    """,
                    (ai_summary, sentiment, keywords_json, news_md5),
                )
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to update AI analysis for {news_md5}: {e}")
            return False

    def get_pending_ai_news(self, limit: int = 10) -> list[NewsItem]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM financial_news
                WHERE ai_summary IS NULL OR sentiment IS NULL
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = cursor.fetchall()
            return [self._row_to_item(row) for row in rows]

    def get_recent_news(self, limit: int = 20) -> list[NewsItem]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM financial_news
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = cursor.fetchall()
            return [self._row_to_item(row) for row in rows]

    def _row_to_item(self, row: sqlite3.Row) -> NewsItem:
        keywords = None
        if row["keywords"]:
            try:
                keywords = json.loads(row["keywords"])
            except (json.JSONDecodeError, TypeError):
                keywords = []
        return NewsItem(
            news_md5=row["news_md5"],
            title=row["title"],
            publish_time=row["publish_time"],
            source_url=row["source_url"],
            raw_content=row["raw_content"],
            ai_summary=row["ai_summary"],
            sentiment=row["sentiment"],
            keywords=keywords,
            created_at=row["created_at"],
        )

    def get_news_sources(self, enabled_only: bool = False) -> list[NewsSource]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if enabled_only:
                cursor.execute(
                    "SELECT * FROM news_sources WHERE enabled = 1 ORDER BY priority ASC, id ASC"
                )
            else:
                cursor.execute(
                    "SELECT * FROM news_sources ORDER BY priority ASC, id ASC"
                )
            rows = cursor.fetchall()
            return [self._row_to_source(row) for row in rows]

    def get_news_source_by_id(self, source_id: int) -> Optional[NewsSource]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM news_sources WHERE id = ?", (source_id,))
            row = cursor.fetchone()
            return self._row_to_source(row) if row else None

    def add_news_source(self, source: NewsSource) -> int:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO news_sources
                    (name, category, list_url, detail_url_selector, title_selector,
                     time_selector, content_selector, robots_url, enabled, priority)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        source.name,
                        source.category,
                        source.list_url,
                        source.detail_url_selector,
                        source.title_selector,
                        source.time_selector,
                        source.content_selector,
                        source.robots_url,
                        source.enabled,
                        source.priority,
                    ),
                )
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Failed to add news source: {e}")
            return 0

    def update_news_source(self, source_id: int, source: NewsSource) -> bool:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE news_sources SET
                        name = ?, category = ?, list_url = ?, detail_url_selector = ?,
                        title_selector = ?, time_selector = ?, content_selector = ?,
                        robots_url = ?, enabled = ?, priority = ?
                    WHERE id = ?
                    """,
                    (
                        source.name,
                        source.category,
                        source.list_url,
                        source.detail_url_selector,
                        source.title_selector,
                        source.time_selector,
                        source.content_selector,
                        source.robots_url,
                        source.enabled,
                        source.priority,
                        source_id,
                    ),
                )
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to update news source {source_id}: {e}")
            return False

    def delete_news_source(self, source_id: int) -> bool:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM news_sources WHERE id = ?", (source_id,))
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to delete news source {source_id}: {e}")
            return False

    def toggle_news_source(self, source_id: int) -> Optional[bool]:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT enabled FROM news_sources WHERE id = ?", (source_id,)
                )
                row = cursor.fetchone()
                if not row:
                    return None
                new_enabled = 0 if row["enabled"] else 1
                cursor.execute(
                    "UPDATE news_sources SET enabled = ? WHERE id = ?",
                    (new_enabled, source_id),
                )
                return bool(new_enabled)
        except Exception as e:
            logger.error(f"Failed to toggle news source {source_id}: {e}")
            return None

    def _row_to_source(self, row: sqlite3.Row) -> NewsSource:
        return NewsSource(
            id=row["id"],
            name=row["name"],
            category=row["category"],
            list_url=row["list_url"],
            detail_url_selector=row["detail_url_selector"],
            title_selector=row["title_selector"],
            time_selector=row["time_selector"],
            content_selector=row["content_selector"],
            robots_url=row["robots_url"],
            enabled=row["enabled"],
            priority=row["priority"],
            created_at=row["created_at"],
        )
