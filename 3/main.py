from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
import requests
from bs4 import BeautifulSoup
import os
import re
import json
import random
from ai_client import AIClient

app = FastAPI(title="网页摘要与情感分析工具")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_MODE = os.getenv("AI_MODE", "mock")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ai_client = AIClient(mode=AI_MODE, api_key=OPENAI_API_KEY)


class AnalyzeRequest(BaseModel):
    url: HttpUrl


class AnalyzeResponse(BaseModel):
    title: str
    summary: str
    sentiment: str
    sentiment_score: float
    content_length: int
    success: bool
    message: str = ""


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def extract_from_json_ld(soup: BeautifulSoup) -> str:
    text_parts = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, dict):
                for key in ["headline", "description", "articleBody", "name", "abstract"]:
                    value = data.get(key)
                    if isinstance(value, str) and len(value) > 50:
                        text_parts.append(value)
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        for key in ["headline", "description", "articleBody", "name"]:
                            value = item.get(key)
                            if isinstance(value, str) and len(value) > 50:
                                text_parts.append(value)
        except:
            continue
    return "\n".join(text_parts)


def extract_from_meta(soup: BeautifulSoup) -> str:
    text_parts = []
    meta_tags = [
        ("name", "description"),
        ("name", "keywords"),
        ("property", "og:title"),
        ("property", "og:description"),
        ("name", "twitter:title"),
        ("name", "twitter:description"),
        ("name", "article:summary"),
    ]
    for attr, value in meta_tags:
        tag = soup.find("meta", attrs={attr: value})
        if tag and tag.get("content"):
            text_parts.append(tag["content"])
    return "\n".join(text_parts)


def extract_from_script_data(soup: BeautifulSoup) -> str:
    text_parts = []
    for script in soup.find_all("script"):
        script_text = script.string or ""
        if len(script_text) < 500:
            continue
        
        patterns = [
            r'"articleBody"\s*:\s*"([^"]{100,})"',
            r'"content"\s*:\s*"([^"]{100,})"',
            r'"description"\s*:\s*"([^"]{100,})"',
            r'"text"\s*:\s*"([^"]{100,})"',
            r'articleInfo\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, script_text, re.DOTALL)
            for match in matches:
                try:
                    if match.startswith("{"):
                        data = json.loads(match)
                        for key in ["content", "articleBody", "description", "title"]:
                            value = data.get(key)
                            if isinstance(value, str) and len(value) > 50:
                                text_parts.append(value)
                    else:
                        decoded = match.encode().decode("unicode_escape")
                        if len(decoded) > 50:
                            text_parts.append(decoded)
                except:
                    if len(match) > 50:
                        try:
                            decoded = match.encode().decode("unicode_escape")
                            text_parts.append(decoded)
                        except:
                            text_parts.append(match)
    
    return "\n".join(text_parts)


def detect_dynamic_content(html_content: str, soup: BeautifulSoup) -> tuple[bool, str]:
    reasons = []
    body = soup.find("body")
    if body:
        body_text = body.get_text(strip=True)
        if len(body_text) < 100:
            reasons.append("页面主体内容为空")
    
    if "window.__INITIAL_STATE__" in html_content or "window.__DATA__" in html_content:
        reasons.append("使用框架动态渲染")
    
    if "byted_acrawler" in html_content or "__ac_nonce" in html_content:
        reasons.append("字节跳动反爬虫系统")
    
    noscript = soup.find("noscript")
    if noscript and "JavaScript" in (noscript.get_text() or ""):
        reasons.append("需要JavaScript支持")
    
    return (len(reasons) > 0, ", ".join(reasons))


def extract_title_from_url(url: str) -> str:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.netloc
    
    if "toutiao.com" in domain:
        return "今日头条文章"
    elif "抖音" in domain or "douyin" in domain:
        return "抖音内容"
    elif "weibo" in domain:
        return "微博内容"
    elif "zhihu" in domain:
        return "知乎内容"
    elif "bilibili" in domain:
        return "B站内容"
    elif "xiaohongshu" in domain:
        return "小红书内容"
    else:
        return f"来自 {domain} 的内容"


def fetch_webpage(url: str) -> tuple[str, str]:
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        response.encoding = response.apparent_encoding or "utf-8"
        html_content = response.text
    except:
        headers["User-Agent"] = USER_AGENTS[0]
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        response.encoding = response.apparent_encoding or "utf-8"
        html_content = response.text

    soup = BeautifulSoup(html_content, "html.parser")
    original_soup = BeautifulSoup(html_content, "html.parser")

    title = soup.title.string if soup.title else "无标题"
    title = title.strip()

    text_parts = []

    json_ld_text = extract_from_json_ld(original_soup)
    if json_ld_text:
        text_parts.append(json_ld_text)

    meta_text = extract_from_meta(original_soup)
    if meta_text:
        text_parts.append(meta_text)

    script_text = extract_from_script_data(original_soup)
    if script_text:
        text_parts.append(script_text)

    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()

    for tag in soup.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "article", "section", "div"]):
        text = tag.get_text(strip=True)
        if text and len(text) > 20:
            text_parts.append(text)

    if sum(len(t) for t in text_parts) < 200:
        full_text = soup.get_text(separator="\n", strip=True)
        lines = [line.strip() for line in full_text.split("\n") if line.strip() and len(line.strip()) > 20]
        text_parts.extend(lines)

    full_text = "\n".join(text_parts)
    
    is_dynamic, dynamic_reason = detect_dynamic_content(html_content, original_soup)
    
    if is_dynamic:
        if not title or title == "无标题":
            title = extract_title_from_url(url)
        
        if len(full_text) < 300:
            warning = f"[检测到动态加载内容的网站]\n\n"
            warning += f"原因: {dynamic_reason}\n\n"
            warning += f"该网站使用JavaScript动态加载内容或有反爬虫机制，\n"
            warning += f"简单的网络请求无法获取完整内容。\n\n"
            warning += f"建议: 尝试复制文章的文字内容直接分析，\n"
            warning += f"或使用支持JavaScript渲染的浏览器扩展。\n\n"
            warning += f"网页标题: {title}\n\n"
            full_text = warning + full_text

    return title, full_text


@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    return FileResponse(html_path)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_url(request: AnalyzeRequest):
    try:
        url = str(request.url)
        title, content = fetch_webpage(url)

        if not content or len(content.strip()) < 50:
            return AnalyzeResponse(
                title=title,
                summary="",
                sentiment="中性",
                sentiment_score=0.5,
                content_length=0,
                success=False,
                message="未能提取到足够的文本内容"
            )

        analysis_result = ai_client.analyze(content)

        return AnalyzeResponse(
            title=title,
            summary=analysis_result.summary,
            sentiment=analysis_result.sentiment,
            sentiment_score=analysis_result.sentiment_score,
            content_length=len(content),
            success=True,
            message="分析完成"
        )

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"网页抓取失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理出错: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "ai_mode": AI_MODE}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
