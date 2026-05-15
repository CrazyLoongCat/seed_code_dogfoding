import asyncio
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List
from .base import NewsItem, NewsSource

class WallstreetCNNewsSource(NewsSource):
    def get_name(self) -> str:
        return "华尔街见闻"
    
    async def fetch_news(self) -> List[NewsItem]:
        news_list = []
        try:
            url = "https://api.wallstreetcn.com/apiv1/content/lives?channel=global"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            response = requests.get(url, headers=headers)
            data = response.json()
            
            for item in data.get("data", []):
                if "title" in item and "content" in item:
                    publish_time = datetime.fromtimestamp(item.get("created_at", 0))
                    news_item = NewsItem(
                        title=item["title"],
                        summary=item["content"],
                        source=self.get_name(),
                        publish_time=publish_time,
                        url=item.get("url", "")
                    )
                    news_list.append(news_item)
        except Exception as e:
            print(f"Error fetching 华尔街见闻 news: {e}")
        
        return news_list
