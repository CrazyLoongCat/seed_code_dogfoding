import os
import json
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import Config
from database import DatabaseManager, NewsItem, NewsSource

app = FastAPI(title="AI 财经新闻情报站 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = DatabaseManager()


class ConfigUpdate(BaseModel):
    AI_PROVIDER: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_MODEL: Optional[str] = None
    QWEN_API_KEY: Optional[str] = None
    QWEN_MODEL: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_MODEL: Optional[str] = None
    ZHIPU_API_KEY: Optional[str] = None
    ZHIPU_MODEL: Optional[str] = None
    MOONSHOT_API_KEY: Optional[str] = None
    MOONSHOT_MODEL: Optional[str] = None
    DOUBAO_API_KEY: Optional[str] = None
    DOUBAO_MODEL: Optional[str] = None
    FETCH_INTERVAL_MINUTES: Optional[int] = None
    REQUEST_DELAY_MIN: Optional[int] = None
    REQUEST_DELAY_MAX: Optional[int] = None
    MAX_NEWS_PER_RUN: Optional[int] = None
    LOG_LEVEL: Optional[str] = None


class NewsSourceCreate(BaseModel):
    name: str
    category: str = "国内"
    list_url: str
    detail_url_selector: Optional[str] = None
    title_selector: Optional[str] = None
    time_selector: Optional[str] = None
    content_selector: Optional[str] = None
    robots_url: Optional[str] = None
    enabled: int = 1
    priority: int = 0


class NewsSourceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    list_url: Optional[str] = None
    detail_url_selector: Optional[str] = None
    title_selector: Optional[str] = None
    time_selector: Optional[str] = None
    content_selector: Optional[str] = None
    robots_url: Optional[str] = None
    enabled: Optional[int] = None
    priority: Optional[int] = None


class SystemStatus(BaseModel):
    total_news: int
    pending_analysis: int
    last_run: Optional[str]
    next_run: Optional[str]
    scheduler_running: bool


def _read_env_file() -> dict[str, str]:
    env_path = Path(".env")
    if not env_path.exists():
        return {}
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    env_dict = {}
    for line in lines:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env_dict[key.strip()] = value.strip().strip('"').strip("'")
    return env_dict


def _write_env_file(env_dict: dict[str, str]) -> None:
    env_path = Path(".env")
    lines = []
    existing = _read_env_file()
    existing.update(env_dict)

    for key, value in existing.items():
        if "KEY" in key or "SECRET" in key:
            lines.append(f'{key}="{value}"')
        else:
            lines.append(f"{key}={value}")

    with open(env_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _reload_config() -> None:
    from importlib import reload
    import config
    reload(config)
    from dotenv import load_dotenv
    load_dotenv(override=True)


@app.get("/api/config")
async def get_config():
    env = _read_env_file()
    public_config = {
        "AI_PROVIDER": env.get("AI_PROVIDER", "openai"),
        "OPENAI_MODEL": env.get("OPENAI_MODEL", "gpt-4o-mini"),
        "GOOGLE_MODEL": env.get("GOOGLE_MODEL", "gemini-1.5-flash"),
        "NEWS_SOURCE_URL": env.get("NEWS_SOURCE_URL", ""),
        "ROBOTS_TXT_URL": env.get("ROBOTS_TXT_URL", ""),
        "FETCH_INTERVAL_MINUTES": int(env.get("FETCH_INTERVAL_MINUTES", "15")),
        "REQUEST_DELAY_MIN": int(env.get("REQUEST_DELAY_MIN", "3")),
        "REQUEST_DELAY_MAX": int(env.get("REQUEST_DELAY_MAX", "7")),
        "MAX_NEWS_PER_RUN": int(env.get("MAX_NEWS_PER_RUN", "20")),
        "LOG_LEVEL": env.get("LOG_LEVEL", "INFO"),
        "HAS_OPENAI_KEY": bool(env.get("OPENAI_API_KEY")),
        "HAS_GOOGLE_KEY": bool(env.get("GOOGLE_API_KEY")),
    }
    return public_config


@app.put("/api/config")
async def update_config(config_update: ConfigUpdate):
    try:
        env_dict = {k: str(v) for k, v in config_update.model_dump(exclude_none=True).items()}
        _write_env_file(env_dict)
        _reload_config()
        return {"status": "success", "message": "配置已更新，部分配置需重启生效"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")


@app.get("/api/news")
async def get_news(limit: int = 20, offset: int = 0, sentiment: Optional[str] = None, has_analysis: Optional[bool] = None):
    try:
        all_news = db.get_recent_news(limit=100)

        if sentiment:
            all_news = [n for n in all_news if n.sentiment == sentiment]
        if has_analysis is True:
            all_news = [n for n in all_news if n.ai_summary is not None]
        elif has_analysis is False:
            all_news = [n for n in all_news if n.ai_summary is None]

        total = len(all_news)
        paginated = all_news[offset:offset + limit]

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": [
                {
                    "id": idx + offset,
                    "news_md5": n.news_md5,
                    "title": n.title,
                    "publish_time": n.publish_time,
                    "source_url": n.source_url,
                    "raw_content": n.raw_content[:200] + "..." if len(n.raw_content) > 200 else n.raw_content,
                    "ai_summary": n.ai_summary,
                    "sentiment": n.sentiment,
                    "keywords": n.keywords,
                    "created_at": n.created_at,
                }
                for idx, n in enumerate(paginated)
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/news/{news_md5}")
async def get_news_detail(news_md5: str):
    all_news = db.get_recent_news(limit=1000)
    for n in all_news:
        if n.news_md5 == news_md5:
            return {
                "news_md5": n.news_md5,
                "title": n.title,
                "publish_time": n.publish_time,
                "source_url": n.source_url,
                "raw_content": n.raw_content,
                "ai_summary": n.ai_summary,
                "sentiment": n.sentiment,
                "keywords": n.keywords,
                "created_at": n.created_at,
            }
    raise HTTPException(status_code=404, detail="News not found")


@app.get("/api/news/pending")
async def get_pending_news():
    pending = db.get_pending_ai_news(limit=50)
    return {
        "count": len(pending),
        "items": [
            {
                "news_md5": n.news_md5,
                "title": n.title,
                "publish_time": n.publish_time,
                "created_at": n.created_at,
            }
            for n in pending
        ],
    }


@app.get("/api/logs")
async def get_logs(limit: int = 100, level: Optional[str] = None):
    log_file = Path(Config.LOG_FILE)
    if not log_file.exists():
        return {"total": 0, "items": []}

    try:
        with open(log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()

        log_pattern = re.compile(
            r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\w+) - (\w+) - (.+)"
        )

        logs = []
        for line in reversed(lines):
            line = line.strip()
            if not line:
                continue
            match = log_pattern.match(line)
            if match:
                timestamp, name, log_level, message = match.groups()
                if level and log_level != level.upper():
                    continue
                logs.append({
                    "timestamp": timestamp,
                    "name": name,
                    "level": log_level,
                    "message": message,
                })
            else:
                if logs:
                    logs[-1]["message"] += "\n" + line

            if len(logs) >= limit:
                break

        return {"total": len(lines), "items": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status")
async def get_status():
    all_news = db.get_recent_news(limit=1000)
    pending = db.get_pending_ai_news(limit=1000)

    last_run = None
    for n in all_news:
        if n.created_at:
            last_run = n.created_at
            break

    return {
        "total_news": len(all_news),
        "pending_analysis": len(pending),
        "last_run": last_run,
        "db_path": Config.DB_PATH,
        "ai_provider": Config.AI_PROVIDER,
        "fetch_interval": Config.FETCH_INTERVAL_MINUTES,
    }


@app.get("/api/stats/sentiment")
async def get_sentiment_stats():
    all_news = db.get_recent_news(limit=1000)
    stats = {"利好": 0, "利空": 0, "中性": 0, "未分析": 0}
    for n in all_news:
        if n.sentiment in stats:
            stats[n.sentiment] += 1
        else:
            stats["未分析"] += 1
    return stats


@app.get("/api/stats/keywords")
async def get_keyword_stats(limit: int = 20):
    all_news = db.get_recent_news(limit=1000)
    keyword_count: dict[str, int] = {}
    for n in all_news:
        if n.keywords:
            for kw in n.keywords:
                keyword_count[kw] = keyword_count.get(kw, 0) + 1

    sorted_keywords = sorted(keyword_count.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [{"keyword": k, "count": v} for k, v in sorted_keywords]


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/sources")
async def get_news_sources():
    try:
        sources = db.get_news_sources()
        return {
            "total": len(sources),
            "items": [
                {
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "list_url": s.list_url,
                    "detail_url_selector": s.detail_url_selector,
                    "title_selector": s.title_selector,
                    "time_selector": s.time_selector,
                    "content_selector": s.content_selector,
                    "robots_url": s.robots_url,
                    "enabled": bool(s.enabled),
                    "priority": s.priority,
                    "created_at": s.created_at,
                }
                for s in sources
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sources/{source_id}")
async def get_news_source(source_id: int):
    source = db.get_news_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return {
        "id": source.id,
        "name": source.name,
        "category": source.category,
        "list_url": source.list_url,
        "detail_url_selector": source.detail_url_selector,
        "title_selector": source.title_selector,
        "time_selector": source.time_selector,
        "content_selector": source.content_selector,
        "robots_url": source.robots_url,
        "enabled": bool(source.enabled),
        "priority": source.priority,
        "created_at": source.created_at,
    }


@app.post("/api/sources")
async def create_news_source(source_data: NewsSourceCreate):
    try:
        source = NewsSource(
            name=source_data.name,
            category=source_data.category,
            list_url=source_data.list_url,
            detail_url_selector=source_data.detail_url_selector,
            title_selector=source_data.title_selector,
            time_selector=source_data.time_selector,
            content_selector=source_data.content_selector,
            robots_url=source_data.robots_url,
            enabled=source_data.enabled,
            priority=source_data.priority,
        )
        source_id = db.add_news_source(source)
        if source_id == 0:
            raise HTTPException(status_code=500, detail="Failed to create news source")
        return {"status": "success", "id": source_id, "message": "新闻源创建成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/sources/{source_id}")
async def update_news_source(source_id: int, source_data: NewsSourceUpdate):
    existing = db.get_news_source_by_id(source_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    try:
        source = NewsSource(
            id=source_id,
            name=source_data.name or existing.name,
            category=source_data.category or existing.category,
            list_url=source_data.list_url or existing.list_url,
            detail_url_selector=source_data.detail_url_selector or existing.detail_url_selector,
            title_selector=source_data.title_selector or existing.title_selector,
            time_selector=source_data.time_selector or existing.time_selector,
            content_selector=source_data.content_selector or existing.content_selector,
            robots_url=source_data.robots_url or existing.robots_url,
            enabled=source_data.enabled if source_data.enabled is not None else existing.enabled,
            priority=source_data.priority if source_data.priority is not None else existing.priority,
        )
        success = db.update_news_source(source_id, source)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update news source")
        return {"status": "success", "message": "新闻源更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/sources/{source_id}")
async def delete_news_source(source_id: int):
    existing = db.get_news_source_by_id(source_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    try:
        success = db.delete_news_source(source_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete news source")
        return {"status": "success", "message": "新闻源删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/sources/{source_id}/toggle")
async def toggle_news_source(source_id: int):
    try:
        result = db.toggle_news_source(source_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Source not found")
        return {
            "status": "success",
            "enabled": result,
            "message": f"新闻源已{'启用' if result else '禁用'}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ai/providers")
async def get_ai_providers():
    providers = [
        {"id": "openai", "name": "OpenAI", "type": "国际", "base_url": "https://api.openai.com/v1"},
        {"id": "google", "name": "Google Gemini", "type": "国际", "base_url": "Google Native API"},
        {"id": "qwen", "name": "通义千问 (阿里)", "type": "国产", "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1"},
        {"id": "deepseek", "name": "DeepSeek", "type": "国产", "base_url": "https://api.deepseek.com/v1"},
        {"id": "zhipu", "name": "智谱AI (GLM)", "type": "国产", "base_url": "https://open.bigmodel.cn/api/paas/v4"},
        {"id": "moonshot", "name": "月之暗面 (Moonshot)", "type": "国产", "base_url": "https://api.moonshot.cn/v1"},
        {"id": "doubao", "name": "字节豆包", "type": "国产", "base_url": "https://ark.cn-beijing.volces.com/api/v3"},
    ]
    return {"providers": providers}


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()
