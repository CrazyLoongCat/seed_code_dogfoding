import os
import asyncio
import time
import json
import csv
import io
import sys
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from bs4 import BeautifulSoup
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="网页可访问性与SEO健康度诊断仪 v2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = {}
rate_limit_data = {"count": 0, "hour_start": time.time()}
history_store: Dict[str, List[Dict[str, Any]]] = {}

MAX_HISTORY_SNAPSHOTS = 3
MAX_BATCH_URLS = 5


class RuleResult(BaseModel):
    name: str
    passed: bool
    status: str
    message: str
    details: Dict[str, Any] = {}


class AISuggestion(BaseModel):
    priority: int
    title: str
    description: str
    impact: str
    difficulty: str = "中"
    expected_score_improvement: int = 0


class AnalyzeResponse(BaseModel):
    url: str
    health_score: int
    rules: List[RuleResult]
    suggestions: List[AISuggestion]
    from_cache: bool = False
    analyzed_at: float = 0


class BatchAnalyzeRequest(BaseModel):
    urls: List[HttpUrl]


class BatchResult(BaseModel):
    url: str
    success: bool
    result: Optional[AnalyzeResponse] = None
    error: Optional[str] = None


class BatchAnalyzeResponse(BaseModel):
    results: List[BatchResult]
    common_issues: List[str] = []
    aggregate_suggestions: List[AISuggestion] = []


class HistorySnapshot(BaseModel):
    url: str
    history: List[Dict[str, Any]]


class TrendPoint(BaseModel):
    timestamp: float
    score: int
    date_str: str


class TrendResponse(BaseModel):
    url: str
    trends: List[TrendPoint]
    comparisons: List[Dict[str, Any]] = []


RULE_CONFIGS = [
    {"name": "图片AltCheck", "display_name": "图片Alt属性", "check": None, "weight": 15},
    {"name": "H1TagCheck", "display_name": "H1标签", "check": None, "weight": 15},
    {"name": "LinkTextCheck", "display_name": "链接文本", "check": None, "weight": 10},
    {"name": "LangAttributeCheck", "display_name": "Lang属性", "check": None, "weight": 10},
    {"name": "TitleLengthCheck", "display_name": "标题长度", "check": None, "weight": 10},
    {"name": "MetaDescriptionCheck", "display_name": "Meta描述", "check": None, "weight": 10},
    {"name": "ViewportCheck", "display_name": "视口设置", "check": None, "weight": 10},
    {"name": "HeadingOrderCheck", "display_name": "标题层级", "check": None, "weight": 10},
]


def check_image_alt(soup: BeautifulSoup) -> RuleResult:
    images = soup.find_all("img")
    total = len(images)
    missing = 0
    for img in images:
        if not img.get("alt") or img.get("alt").strip() == "":
            missing += 1
    if total == 0:
        return RuleResult(name="图片Alt属性", passed=True, status="pass", message="页面没有图片", details={"total": 0, "missing": 0})
    passed = missing == 0
    status = "pass" if passed else ("warning" if missing / total < 0.3 else "fail")
    return RuleResult(
        name="图片Alt属性", passed=passed, status=status,
        message=f"检测到 {total} 张图片，{missing} 张缺少alt属性" if missing > 0 else "所有图片都有alt属性",
        details={"total": total, "missing": missing}
    )


def check_h1_tag(soup: BeautifulSoup) -> RuleResult:
    h1_tags = soup.find_all("h1")
    count = len(h1_tags)
    if count == 0:
        return RuleResult(name="H1标签", passed=False, status="fail", message="页面缺少H1标签", details={"count": 0})
    elif count == 1:
        return RuleResult(name="H1标签", passed=True, status="pass", message="页面有且仅有一个H1标签",
                         details={"count": 1, "text": h1_tags[0].get_text(strip=True)[:50]})
    else:
        return RuleResult(name="H1标签", passed=False, status="warning",
                         message=f"页面有 {count} 个H1标签", details={"count": count})


def check_link_text(soup: BeautifulSoup) -> RuleResult:
    links = soup.find_all("a")
    total = len(links)
    bad_links = 0
    for link in links:
        text = link.get_text(strip=True)
        if not text and not link.find("img"):
            bad_links += 1
    if total == 0:
        return RuleResult(name="链接文本", passed=True, status="pass", message="页面没有链接", details={"total": 0, "bad": 0})
    passed = bad_links == 0
    status = "pass" if passed else ("warning" if bad_links / total < 0.2 else "fail")
    return RuleResult(
        name="链接文本", passed=passed, status=status,
        message=f"检测到 {total} 个链接，{bad_links} 个缺少可识别文本" if bad_links > 0 else "所有链接都有可识别文本",
        details={"total": total, "bad": bad_links}
    )


def check_lang_attribute(soup: BeautifulSoup) -> RuleResult:
    html_tag = soup.find("html")
    if html_tag and html_tag.get("lang"):
        return RuleResult(name="Lang属性", passed=True, status="pass",
                         message=f"页面设置了lang属性: {html_tag.get('lang')}", details={"lang": html_tag.get('lang')})
    return RuleResult(name="Lang属性", passed=False, status="fail", message="页面缺少lang属性", details={})


def check_title_length(soup: BeautifulSoup) -> RuleResult:
    title_tag = soup.find("title")
    if not title_tag:
        return RuleResult(name="标题长度", passed=False, status="fail", message="页面缺少title标签", details={})
    title_text = title_tag.get_text(strip=True)
    length = len(title_text)
    if 20 <= length <= 60:
        return RuleResult(name="标题长度", passed=True, status="pass", message=f"标题长度合适 ({length}字符)",
                         details={"length": length, "title": title_text})
    elif length < 20:
        return RuleResult(name="标题长度", passed=False, status="warning",
                         message=f"标题太短 ({length}字符)", details={"length": length, "title": title_text})
    else:
        return RuleResult(name="标题长度", passed=False, status="warning",
                         message=f"标题太长 ({length}字符)", details={"length": length, "title": title_text})


def check_meta_description(soup: BeautifulSoup) -> RuleResult:
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if not meta_desc or not meta_desc.get("content"):
        return RuleResult(name="Meta描述", passed=False, status="fail", message="页面缺少meta description", details={})
    content = meta_desc.get("content", "").strip()
    length = len(content)
    if 50 <= length <= 160:
        return RuleResult(name="Meta描述", passed=True, status="pass", message=f"Meta描述长度合适 ({length}字符)",
                         details={"length": length, "content": content})
    elif length < 50:
        return RuleResult(name="Meta描述", passed=False, status="warning",
                         message=f"Meta描述太短 ({length}字符)", details={"length": length, "content": content})
    else:
        return RuleResult(name="Meta描述", passed=False, status="warning",
                         message=f"Meta描述太长 ({length}字符)", details={"length": length, "content": content})


def check_viewport(soup: BeautifulSoup) -> RuleResult:
    viewport = soup.find("meta", attrs={"name": "viewport"})
    if viewport and viewport.get("content"):
        content = viewport.get("content", "")
        if "width=device-width" in content:
            return RuleResult(name="视口设置", passed=True, status="pass", message="移动端视口设置正确", details={"content": content})
        return RuleResult(name="视口设置", passed=False, status="warning", message="视口设置缺少width=device-width", details={"content": content})
    return RuleResult(name="视口设置", passed=False, status="fail", message="页面缺少viewport meta标签", details={})


def check_heading_order(soup: BeautifulSoup) -> RuleResult:
    headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
    if not headings:
        return RuleResult(name="标题层级", passed=True, status="pass", message="页面没有标题", details={"total": 0})
    levels = [int(h.name[1]) for h in headings]
    prev = 0
    skipped = 0
    for level in levels:
        if level > prev + 1:
            skipped += 1
        prev = level
    if skipped == 0:
        return RuleResult(name="标题层级", passed=True, status="pass", message="标题层级正确",
                         details={"total": len(levels), "levels": levels})
    return RuleResult(name="标题层级", passed=False, status="warning",
                     message=f"发现 {skipped} 处标题层级跳跃",
                     details={"total": len(levels), "skipped": skipped, "levels": levels})


RULE_CHECK_FUNCTIONS = [
    check_image_alt, check_h1_tag, check_link_text, check_lang_attribute,
    check_title_length, check_meta_description, check_viewport, check_heading_order
]


def calculate_health_score(rules: List[RuleResult]) -> int:
    total_weight = sum(rc["weight"] for rc in RULE_CONFIGS)
    score = 0
    for i, rule in enumerate(rules):
        weight = RULE_CONFIGS[i]["weight"]
        if rule.status == "pass":
            score += weight
        elif rule.status == "warning":
            score += weight * 0.5
    return int((score / total_weight) * 100)


def estimate_score_improvement(rule_name: str, rule: RuleResult) -> int:
    idx = -1
    for i, rc in enumerate(RULE_CONFIGS):
        if rc["display_name"] == rule_name:
            idx = i
            break
    if idx < 0:
        return 5
    weight = RULE_CONFIGS[idx]["weight"]
    if rule.status == "fail":
        return weight
    elif rule.status == "warning":
        return weight // 2
    return 0


def get_mock_score_for_domain(url: str) -> int:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    domain_hash = hash(domain) % 100
    if "example.com" in domain:
        return 80
    elif "test.com" in domain:
        return 45
    elif "google.com" in domain or "github.com" in domain:
        return 95
    elif "baidu.com" in domain:
        return 75
    return max(20, min(95, 40 + domain_hash))


def generate_mock_suggestions(rules: List[RuleResult], url: str = "") -> List[AISuggestion]:
    ai_mode = os.getenv("AI_MODE", "mock")
    if ai_mode == "mock_dynamic":
        base_score = get_mock_score_for_domain(url)
        if base_score >= 80:
            return [
                AISuggestion(priority=1, title="页面表现优秀", description="您的网页在可访问性和SEO方面表现出色！", impact="低", difficulty="低", expected_score_improvement=5)
            ]
        elif base_score >= 60:
            return [
                AISuggestion(priority=1, title="优化图片Alt属性", description="为图片添加描述性alt属性可提升可访问性。", impact="高", difficulty="低", expected_score_improvement=15),
                AISuggestion(priority=2, title="添加H1标签", description="页面缺少H1标签，添加后可提升SEO效果。", impact="高", difficulty="中", expected_score_improvement=15),
                AISuggestion(priority=3, title="优化页面标题", description="标题长度应控制在20-60字符之间。", impact="中", difficulty="低", expected_score_improvement=10),
            ]
        else:
            return [
                AISuggestion(priority=1, title="添加视口设置", description="缺少viewport设置会影响移动端体验。", impact="高", difficulty="低", expected_score_improvement=10),
                AISuggestion(priority=2, title="添加Lang属性", description="设置页面语言有助于屏幕阅读器识别。", impact="高", difficulty="低", expected_score_improvement=10),
                AISuggestion(priority=3, title="全面优化SEO元素", description="页面缺少多个关键SEO元素，建议逐项优化。", impact="高", difficulty="中", expected_score_improvement=20),
                AISuggestion(priority=4, title="改进链接文本", description="使用描述性链接文本提升用户体验。", impact="中", difficulty="中", expected_score_improvement=10),
                AISuggestion(priority=5, title="添加Meta描述", description="好的Meta描述能提高搜索结果点击率。", impact="中", difficulty="低", expected_score_improvement=10),
            ]

    suggestions = []
    failed_rules = [r for r in rules if r.status != "pass"]
    priority = 1
    for rule in failed_rules[:5]:
        improvement = estimate_score_improvement(rule.name, rule)
        if rule.name == "图片Alt属性":
            suggestions.append(AISuggestion(
                priority=priority, title="为图片添加描述性alt属性",
                description=f"检测到 {rule.details.get('missing', 0)} 张图片缺少alt属性。",
                impact="高", difficulty="低", expected_score_improvement=improvement
            ))
        elif rule.name == "H1标签":
            suggestions.append(AISuggestion(
                priority=priority, title="添加H1标签" if rule.details.get("count", 0) == 0 else "减少H1标签数量",
                description="H1标签应该唯一且准确描述页面内容。",
                impact="高", difficulty="中", expected_score_improvement=improvement
            ))
        elif rule.name == "链接文本":
            suggestions.append(AISuggestion(
                priority=priority, title="改进链接文本",
                description=f"有 {rule.details.get('bad', 0)} 个链接缺少可识别文本。",
                impact="中", difficulty="中", expected_score_improvement=improvement
            ))
        elif rule.name == "Lang属性":
            suggestions.append(AISuggestion(
                priority=priority, title="设置页面语言",
                description="在<html>标签上添加lang属性。",
                impact="中", difficulty="低", expected_score_improvement=improvement
            ))
        elif rule.name == "标题长度":
            suggestions.append(AISuggestion(
                priority=priority, title="优化页面标题长度",
                description=rule.message, impact="中", difficulty="低", expected_score_improvement=improvement
            ))
        elif rule.name == "Meta描述":
            suggestions.append(AISuggestion(
                priority=priority, title="优化Meta描述",
                description=rule.message, impact="中", difficulty="低", expected_score_improvement=improvement
            ))
        elif rule.name == "视口设置":
            suggestions.append(AISuggestion(
                priority=priority, title="添加移动端视口设置",
                description="添加viewport meta标签确保移动端正确显示。",
                impact="高", difficulty="低", expected_score_improvement=improvement
            ))
        elif rule.name == "标题层级":
            suggestions.append(AISuggestion(
                priority=priority, title="修复标题层级结构",
                description=rule.message, impact="低", difficulty="中", expected_score_improvement=improvement
            ))
        priority += 1
    if not suggestions:
        suggestions.append(AISuggestion(
            priority=1, title="页面表现良好",
            description="你的网页在可访问性和SEO方面表现不错！",
            impact="低", difficulty="低", expected_score_improvement=0
        ))
    return suggestions


async def call_ai_suggestions(rules: List[RuleResult], url: str = "") -> List[AISuggestion]:
    ai_mode = os.getenv("AI_MODE", "mock")
    if ai_mode in ["mock", "mock_dynamic"]:
        return generate_mock_suggestions(rules, url)
    try:
        import openai
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return generate_mock_suggestions(rules, url)
        client = openai.AsyncOpenAI(api_key=api_key)
        issues = [f"- {rule.name}: {rule.message}" for rule in rules if rule.status != "pass"]
        prompt = f"""作为网页可访问性和SEO专家，根据以下问题生成最多5条优化建议：

检测到的问题：
{chr(10).join(issues)}

返回JSON格式，每条建议包含：
- priority: 优先级(1-5)
- title: 简短标题
- description: 详细建议
- impact: 影响程度(高/中/低)
- difficulty: 修复难度(低/中/高)
- expected_score_improvement: 预估提升分数(0-20)
"""
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        content = response.choices[0].message.content
        try:
            data = json.loads(content)
            if isinstance(data, dict) and "suggestions" in data:
                return [AISuggestion(**s) for s in data["suggestions"]]
            elif isinstance(data, list):
                return [AISuggestion(**s) for s in data]
        except Exception:
            pass
        return generate_mock_suggestions(rules, url)
    except Exception:
        return generate_mock_suggestions(rules, url)


async def generate_common_issues_ai(results: List[AnalyzeResponse]) -> Tuple[List[str], List[AISuggestion]]:
    all_rules = {}
    for result in results:
        for rule in result.rules:
            if rule.name not in all_rules:
                all_rules[rule.name] = []
            all_rules[rule.name].append(rule.status)

    common_issues = []
    total_pages = len(results)
    for rule_name, statuses in all_rules.items():
        fail_count = sum(1 for s in statuses if s in ["fail", "warning"])
        if fail_count >= total_pages * 0.6:
            common_issues.append(f"{rule_name}: {fail_count}/{total_pages} 个页面存在问题")

    ai_mode = os.getenv("AI_MODE", "mock")
    if ai_mode in ["mock", "mock_dynamic"]:
        mock_suggestions = []
        if common_issues:
            mock_suggestions.append(AISuggestion(
                priority=1, title="批量优化共性问题",
                description=f"发现 {len(common_issues)} 个共性问题，建议优先统一修复。",
                impact="高", difficulty="中", expected_score_improvement=15
            ))
        return common_issues, mock_suggestions
    return common_issues, []


def is_cached(url: str) -> Tuple[bool, Optional[AnalyzeResponse]]:
    ttl = int(os.getenv("CACHE_TTL_SECONDS", "600"))
    if url in cache:
        cached_time, cached_data = cache[url]
        if time.time() - cached_time < ttl:
            return True, cached_data
    return False, None


def check_rate_limit() -> bool:
    limit = int(os.getenv("RATE_LIMIT_PER_HOUR", "50"))
    now = time.time()
    if now - rate_limit_data["hour_start"] > 3600:
        rate_limit_data["count"] = 0
        rate_limit_data["hour_start"] = now
    if rate_limit_data["count"] >= limit:
        return False
    rate_limit_data["count"] += 1
    return True


def save_to_history(url: str, result: AnalyzeResponse):
    if url not in history_store:
        history_store[url] = []
    snapshot = {
        "timestamp": result.analyzed_at,
        "score": result.health_score,
        "rules": [r.model_dump() for r in result.rules],
        "date_str": datetime.fromtimestamp(result.analyzed_at).strftime("%Y-%m-%d %H:%M:%S")
    }
    history_store[url].append(snapshot)
    if len(history_store[url]) > MAX_HISTORY_SNAPSHOTS:
        history_store[url] = history_store[url][-MAX_HISTORY_SNAPSHOTS:]


async def fetch_url_with_retry(url: str, max_retries: int = 1, timeout: int = 10) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                response.encoding = response.apparent_encoding or "utf-8"
                return response.text
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                await asyncio.sleep(1)
    raise last_error if last_error else Exception("未知错误")


async def analyze_single_url(url: str, use_cache: bool = True) -> AnalyzeResponse:
    url_str = str(url)
    if use_cache:
        is_hit, cached_data = is_cached(url_str)
        if is_hit:
            cached_data.from_cache = True
            return cached_data
    if not check_rate_limit():
        raise HTTPException(status_code=429, detail="请求过于频繁")
    try:
        html = await fetch_url_with_retry(url_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"无法抓取网页: {str(e)}")
    soup = BeautifulSoup(html, "html.parser")
    rules = []
    for check_func in RULE_CHECK_FUNCTIONS:
        try:
            rules.append(check_func(soup))
        except Exception as e:
            rules.append(RuleResult(
                name="检测项", passed=False, status="warning",
                message=f"检查失败: {str(e)}", details={}
            ))
    health_score = calculate_health_score(rules)
    suggestions = await call_ai_suggestions(rules, url_str)
    result = AnalyzeResponse(
        url=url_str, health_score=health_score, rules=rules,
        suggestions=suggestions, from_cache=False, analyzed_at=time.time()
    )
    cache[url_str] = (time.time(), result)
    save_to_history(url_str, result)
    return result


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(request: Dict[str, Any]):
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="缺少URL参数")
    return await analyze_single_url(url)


@app.post("/api/batch-analyze", response_model=BatchAnalyzeResponse)
async def batch_analyze(request: BatchAnalyzeRequest):
    urls = [str(u) for u in request.urls[:MAX_BATCH_URLS]]
    results: List[BatchResult] = []
    successful_results: List[AnalyzeResponse] = []
    async_tasks = [analyze_single_url(url) for url in urls]
    task_results = await asyncio.gather(*async_tasks, return_exceptions=True)
    for url, task_result in zip(urls, task_results):
        if isinstance(task_result, Exception):
            error_detail = str(task_result)
            if isinstance(task_result, HTTPException):
                error_detail = str(task_result.detail)
            results.append(BatchResult(url=url, success=False, error=error_detail))
        else:
            results.append(BatchResult(url=url, success=True, result=task_result))
            successful_results.append(task_result)
    common_issues, aggregate_suggestions = await generate_common_issues_ai(successful_results)
    return BatchAnalyzeResponse(
        results=results, common_issues=common_issues, aggregate_suggestions=aggregate_suggestions
    )


@app.post("/api/upload-analyze", response_model=BatchAnalyzeResponse)
async def upload_analyze(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    urls = [line.strip() for line in text.split("\n") if line.strip() and not line.strip().startswith("#")]
    urls = urls[:MAX_BATCH_URLS]
    valid_urls = []
    for u in urls:
        try:
            HttpUrl(url=u)
            valid_urls.append(u)
        except Exception:
            continue
    request = BatchAnalyzeRequest(urls=valid_urls)
    return await batch_analyze(request)


@app.get("/api/history", response_model=HistorySnapshot)
async def get_history(url: str):
    return HistorySnapshot(url=url, history=history_store.get(url, []))


@app.get("/api/trend", response_model=TrendResponse)
async def get_trend(url: str):
    history = history_store.get(url, [])
    trends = [
        TrendPoint(timestamp=h["timestamp"], score=h["score"], date_str=h["date_str"])
        for h in history
    ]
    comparisons = []
    if len(history) >= 2:
        latest = history[-1]
        previous = history[-2]
        for i, (lr, pr) in enumerate(zip(latest["rules"], previous["rules"])):
            if lr["status"] != pr["status"]:
                comparisons.append({
                    "rule_name": lr["name"],
                    "previous": pr["status"],
                    "current": lr["status"],
                    "improved": lr["status"] == "pass" and pr["status"] != "pass",
                    "regressed": lr["status"] != "pass" and pr["status"] == "pass"
                })
    return TrendResponse(url=url, trends=trends, comparisons=comparisons)


@app.get("/api/export")
async def export_report(url: str, format: str = "json"):
    is_hit, cached_data = is_cached(url)
    if not cached_data and url not in history_store:
        raise HTTPException(status_code=404, detail="没有该URL的分析记录")
    data = cached_data.model_dump() if cached_data else history_store[url][-1]
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["检测项", "状态", "说明"])
        for rule in data.get("rules", []):
            writer.writerow([rule["name"], rule["status"], rule["message"]])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=report_{urlparse(url).netloc}.csv"}
        )
    else:
        return data


@app.get("/test/diagnose")
async def test_diagnose(url: str = ""):
    return {
        "url": url or "https://example.com",
        "health_score": 85,
        "rules": [
            {"name": "图片Alt属性", "passed": True, "status": "pass", "message": "所有图片都有alt属性", "details": {"total": 10, "missing": 0}},
            {"name": "H1标签", "passed": True, "status": "pass", "message": "页面有且仅有一个H1标签", "details": {"count": 1}},
            {"name": "链接文本", "passed": True, "status": "pass", "message": "所有链接都有可识别文本", "details": {"total": 25, "bad": 0}},
            {"name": "Lang属性", "passed": True, "status": "pass", "message": "页面设置了lang属性", "details": {"lang": "zh-CN"}},
            {"name": "标题长度", "passed": True, "status": "pass", "message": "标题长度合适 (45字符)", "details": {"length": 45}},
            {"name": "Meta描述", "passed": True, "status": "pass", "message": "Meta描述长度合适 (120字符)", "details": {"length": 120}},
            {"name": "视口设置", "passed": True, "status": "pass", "message": "移动端视口设置正确", "details": {}},
            {"name": "标题层级", "passed": True, "status": "pass", "message": "标题层级正确", "details": {"total": 8}},
        ],
        "suggestions": [
            {"priority": 1, "title": "页面表现良好", "description": "测试数据：您的网页表现不错！", "impact": "低", "difficulty": "低", "expected_score_improvement": 5}
        ],
        "from_cache": False,
        "analyzed_at": time.time(),
        "_test_mode": True
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")


def run_cli_mode():
    if len(sys.argv) < 2:
        return
    if sys.argv[1] == "--analyze" and len(sys.argv) >= 3:
        url = sys.argv[2]
        import asyncio
        result = asyncio.run(analyze_single_url(url))
        print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
        sys.exit(0)
    elif sys.argv[1] == "--help":
        print("网页可访问性与SEO健康度诊断仪 v2.0")
        print("用法:")
        print("  python main.py                    # 启动Web服务")
        print("  python main.py --analyze <url>    # CLI模式，输出JSON")
        print("  python main.py --help             # 显示帮助")
        sys.exit(0)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_cli_mode()
    else:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)
