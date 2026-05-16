from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class NewsItem(BaseModel):
    title: str
    hot_value: float
    original_hot: str
    source: str
    rank: int = 0


class CompareRequest(BaseModel):
    url1: str
    url2: str
    source1_name: str = "来源1"
    source2_name: str = "来源2"
    use_simulate_ai: bool = True
    ai_api_key: Optional[str] = None


class CompareResponse(BaseModel):
    merged_news: List[NewsItem]
    ai_analysis: Dict[str, Any]
    source1_count: int
    source2_count: int
    error_messages: List[str]
    cached: bool = False


class ThemeAnalysis(BaseModel):
    common_themes: List[str]
    comparison: str
    source1_topics: List[str]
    source2_topics: List[str]


class CustomParserConfig(BaseModel):
    name: str
    url_pattern: str
    item_selector: str
    title_selector: str
    hot_selector: str
    is_rss: bool = False
