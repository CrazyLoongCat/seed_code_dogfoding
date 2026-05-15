from typing import Dict, Type
from .base import NewsSource
from .caulian import CaulianNewsSource
from .wallstreetcn import WallstreetCNNewsSource
from .sina import SinaNewsSource
from .jin10 import Jin10NewsSource
from .reuters import ReutersNewsSource

class NewsSourceFactory:
    _sources: Dict[str, Type[NewsSource]] = {
        "caulian": CaulianNewsSource,
        "wallstreetcn": WallstreetCNNewsSource,
        "sina": SinaNewsSource,
        "jin10": Jin10NewsSource,
        "reuters": ReutersNewsSource
    }
    
    @classmethod
    def get_source(cls, source_name: str) -> NewsSource:
        source_class = cls._sources.get(source_name.lower())
        if source_class:
            return source_class()
        raise ValueError(f"Unknown news source: {source_name}")
    
    @classmethod
    def get_all_sources(cls) -> list:
        return list(cls._sources.keys())
