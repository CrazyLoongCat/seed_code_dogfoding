import re
import asyncio
from typing import List, Tuple, Dict
from difflib import SequenceMatcher
from .models import NewsItem


def normalize_hot_value(hot_str: str) -> float:
    if not hot_str:
        return 0.0
    hot_str = str(hot_str).strip()
    hot_str = hot_str.replace(',', '')
    
    match = re.search(r'(\d+\.?\d*)', hot_str)
    if not match:
        return 0.0
    
    num = float(match.group(1))
    
    hot_lower = hot_str.lower()
    if '万' in hot_str or 'w' in hot_lower:
        num *= 10000
    elif '亿' in hot_str:
        num *= 100000000
    elif '千' in hot_str or 'k' in hot_lower:
        num *= 1000
    elif 'm' in hot_lower:
        num *= 1000000
    
    return num


def titles_similar(title1: str, title2: str, threshold: float = 0.85) -> bool:
    if not title1 or not title2:
        return False
    t1 = title1.strip().lower()
    t2 = title2.strip().lower()
    if t1 == t2:
        return True
    if t1 in t2 or t2 in t1:
        return True
    similarity = SequenceMatcher(None, t1, t2).ratio()
    return similarity >= threshold


def merge_news_lists(list1: List[NewsItem], list2: List[NewsItem]) -> List[NewsItem]:
    merged: List[NewsItem] = []
    used_indices2 = set()
    
    for item1 in list1:
        found_match = False
        for idx2, item2 in enumerate(list2):
            if idx2 in used_indices2:
                continue
            if titles_similar(item1.title, item2.title):
                merged_source = f"{item1.source}, {item2.source}"
                merged_hot = max(item1.hot_value, item2.hot_value)
                merged_original = f"{item1.original_hot} / {item2.original_hot}"
                merged.append(NewsItem(
                    title=item1.title,
                    hot_value=merged_hot,
                    original_hot=merged_original,
                    source=merged_source,
                    rank=max(item1.rank, item2.rank)
                ))
                used_indices2.add(idx2)
                found_match = True
                break
        if not found_match:
            merged.append(item1)
    
    for idx2, item2 in enumerate(list2):
        if idx2 not in used_indices2:
            merged.append(item2)
    
    merged.sort(key=lambda x: x.hot_value, reverse=True)
    return merged


class Cache:
    def __init__(self, ttl_seconds: int = 60):
        self._cache: Dict[str, Tuple[float, any]] = {}
        self._ttl = ttl_seconds
    
    def get(self, key: str) -> any:
        import time
        if key in self._cache:
            timestamp, value = self._cache[key]
            if time.time() - timestamp < self._ttl:
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: any) -> None:
        import time
        self._cache[key] = (time.time(), value)
    
    def clear(self) -> None:
        self._cache.clear()


cache = Cache(ttl_seconds=60)
