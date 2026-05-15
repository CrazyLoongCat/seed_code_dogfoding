import asyncio
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List
from .base import NewsItem, NewsSource

class Jin10NewsSource(NewsSource):
    def get_name(self) -> str:
        return "金十数据"
    
    async def fetch_news(self) -> List[NewsItem]:
        news_list = []
        try:
            url = "https://cdn.jin10.com/jin10/index.php/webapi/indicator/list?category=all&limit=50"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            response = requests.get(url, headers=headers)
            data = response.json()
            
            for item in data.get("data", []):
                if "title" in item:
                    publish_time = datetime.fromtimestamp(item.get("time", 0))
                    news_item = NewsItem(
                        title=item["title"],
                        summary=item.get("description", ""),
                        source=self.get_name(),
                        publish_time=publish_time,
                        url=f"https://www.jin10.com/event/{item.get('id', '')}"
                    )
                    news_list.append(news_item)
        except Exception as e:
            print(f"Error fetching 金十数据 news: {e}")
        
        return news_list
