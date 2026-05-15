import asyncio
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List
from .base import NewsItem, NewsSource

class SinaNewsSource(NewsSource):
    def get_name(self) -> str:
        return "新浪财经"
    
    async def fetch_news(self) -> List[NewsItem]:
        news_list = []
        try:
            url = "https://finance.sina.com.cn/"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.encoding = "utf-8"
            soup = BeautifulSoup(response.text, "html.parser")
            
            for item in soup.find_all("a", href=True):
                text = item.get_text(strip=True)
                if text and len(text) > 15:
                    title = text
                    url = item["href"]
                    if url.startswith("//"):
                        url = "https:" + url
                    if url.startswith("/"):
                        url = "https://finance.sina.com.cn" + url
                    
                    if "finance.sina" in url or "sina.com.cn" in url:
                        news_item = NewsItem(
                            title=title,
                            summary=title,
                            source=self.get_name(),
                            publish_time=datetime.now(),
                            url=url
                        )
                        news_list.append(news_item)
        except Exception as e:
            print(f"Error fetching 新浪财经 news: {e}")
        
        return news_list[:30]
