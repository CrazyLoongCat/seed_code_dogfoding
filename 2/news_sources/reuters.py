import asyncio
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List
from .base import NewsItem, NewsSource

class ReutersNewsSource(NewsSource):
    def get_name(self) -> str:
        return "Reuters"
    
    async def fetch_news(self) -> List[NewsItem]:
        news_list = []
        try:
            url = "https://www.reuters.com/"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.text, "html.parser")
            
            for item in soup.find_all("a", href=True):
                text = item.get_text(strip=True)
                if text and len(text) > 10 and "/article/" in item["href"]:
                    title = text
                    url = "https://www.reuters.com" + item["href"]
                    news_item = NewsItem(
                        title=title,
                        summary="",
                        source=self.get_name(),
                        publish_time=datetime.now(),
                        url=url
                    )
                    news_list.append(news_item)
        except Exception as e:
            print(f"Error fetching Reuters news: {e}")
        
        return news_list[:20]
