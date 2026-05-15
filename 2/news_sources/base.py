from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

@dataclass
class NewsItem:
    title: str
    summary: str
    source: str
    publish_time: datetime
    url: str
    category: Optional[str] = None
    
    def to_dict(self):
        return {
            "title": self.title,
            "summary": self.summary,
            "source": self.source,
            "publish_time": self.publish_time.isoformat(),
            "url": self.url,
            "category": self.category
        }

class NewsSource(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass
    
    @abstractmethod
    async def fetch_news(self) -> List[NewsItem]:
        pass
    
    def get_today_news(self, news_list: List[NewsItem], timezone: str = "Asia/Shanghai") -> List[NewsItem]:
        import pytz
        today = datetime.now(pytz.timezone(timezone)).date()
        return [news for news in news_list if news.publish_time.date() == today]
