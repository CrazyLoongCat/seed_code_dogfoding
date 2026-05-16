from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
import hashlib
import os

from .models import CompareRequest, CompareResponse, CustomParserConfig, NewsItem
from .parser import parse_multiple_sources, ParserRegistry
from .utils import merge_news_lists, cache
from .ai_analyzer import analyze_news

app = FastAPI(title="新闻热点趋势对比器", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "static", "index.html"))


@app.get("/styles.css")
async def styles_css():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "static", "styles.css"))


@app.get("/app.js")
async def app_js():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "static", "app.js"))


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "新闻热点趋势对比器服务运行中"}


@app.get("/api/parsers")
async def get_available_parsers():
    parsers = []
    for parser in ParserRegistry._parsers:
        parsers.append({"name": parser.name})
    for parser in ParserRegistry._custom_parsers:
        parsers.append({"name": parser.name, "custom": True})
    return {"parsers": parsers}


@app.post("/api/register-parser")
async def register_custom_parser(config: CustomParserConfig):
    try:
        ParserRegistry.register_custom(config)
        return {"success": True, "message": f"自定义解析器 '{config.name}' 已注册"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/compare", response_model=CompareResponse)
async def compare_news(request: CompareRequest):
    cache_key = hashlib.md5(
        f"{request.url1}|{request.url2}|{request.source1_name}|{request.source2_name}|{request.use_simulate_ai}".encode()
    ).hexdigest()
    
    cached_result = cache.get(cache_key)
    if cached_result:
        cached_result["cached"] = True
        return cached_result
    
    results = await parse_multiple_sources(
        [request.url1, request.url2],
        [request.source1_name, request.source2_name]
    )
    
    list1, error1 = results[0]
    list2, error2 = results[1]
    
    errors = []
    if error1:
        errors.append(error1)
    if error2:
        errors.append(error2)
    
    if not list1 and not list2:
        raise HTTPException(
            status_code=400,
            detail="两个来源都无法获取数据: " + "; ".join(errors)
        )
    
    merged = merge_news_lists(list1, list2)
    
    ai_analysis = await analyze_news(
        merged,
        request.source1_name,
        request.source2_name,
        use_simulate=request.use_simulate_ai,
        api_key=request.ai_api_key
    )
    
    source1_count = len([item for item in merged if request.source1_name in item.source])
    source2_count = len([item for item in merged if request.source2_name in item.source])
    
    response = CompareResponse(
        merged_news=merged,
        ai_analysis=ai_analysis,
        source1_count=source1_count,
        source2_count=source2_count,
        error_messages=errors,
        cached=False
    )
    
    cache.set(cache_key, response.model_dump())
    
    return response


@app.get("/api/cache/clear")
async def clear_cache():
    cache.clear()
    return {"success": True, "message": "缓存已清空"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
