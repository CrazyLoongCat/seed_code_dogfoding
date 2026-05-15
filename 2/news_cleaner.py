from typing import List, Set, Tuple
from datetime import datetime
import pytz
from news_sources.base import NewsItem

class NewsCleaner:
    MIN_CONTENT_LENGTH = 15
    
    CATEGORY_KEYWORDS = {
        "宏观": ["GDP", "经济", "CPI", "PPI", "通胀", "货币政策", "利率", "汇率", "央行", "美联储", "宏观"],
        "A股": ["上证指数", "沪深", "A股", "创业板", "科创板", "沪指", "深成指", "大盘"],
        "美股": ["纳斯达克", "道琼斯", "标普", "美股", "美联储", "Apple", "Microsoft", "科技股"],
        "商品": ["原油", "黄金", "铜", "铁矿石", "农产品", "期货", "大宗商品"],
        "政策": ["政策", "监管", "发改委", "财政部", "国务院", "政治局", "会议", "央行"],
        "公司": ["公司", "企业", "财报", "业绩", "上市", "退市", "并购", "收购"],
        "地缘": ["地缘", "战争", "冲突", "国际", "贸易", "关税", "制裁"]
    }
    
    @staticmethod
    def filter_short_content(news_list: List[NewsItem]) -> List[NewsItem]:
        return [news for news in news_list if len(news.title) >= NewsCleaner.MIN_CONTENT_LENGTH]
    
    @staticmethod
    def filter_today_news(news_list: List[NewsItem], timezone: str = "Asia/Shanghai") -> List[NewsItem]:
        tz = pytz.timezone(timezone)
        today = datetime.now(tz).date()
        return [news for news in news_list if news.publish_time.date() == today]
    
    @staticmethod
    def remove_duplicates(news_list: List[NewsItem]) -> List[NewsItem]:
        seen_titles: Set[str] = set()
        unique_news = []
        
        for news in news_list:
            normalized_title = news.title.strip().lower()
            if normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_news.append(news)
        
        return unique_news
    
    @staticmethod
    def categorize_news(news_item: NewsItem) -> str:
        text = news_item.title + " " + news_item.summary
        
        for category, keywords in NewsCleaner.CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    return category
        
        return "其他"
    
    @staticmethod
    def clean_and_preprocess(news_list: List[NewsItem], timezone: str = "Asia/Shanghai") -> List[NewsItem]:
        news_list = NewsCleaner.filter_short_content(news_list)
        news_list = NewsCleaner.remove_duplicates(news_list)
        
        for news in news_list:
            news.category = NewsCleaner.categorize_news(news)
        
        news_list.sort(key=lambda x: x.publish_time, reverse=True)
        
        return news_list
