import json
import logging
import re
from typing import Optional
from dataclasses import dataclass

from config import Config
from database import NewsItem

logger = logging.getLogger(__name__)


@dataclass
class AIAnalysisResult:
    summary: str
    sentiment: str
    keywords: list[str]


SYSTEM_PROMPT = """你是一个专业的全级财经分析师。请对输入的财经新闻进行"脱水"处理：
1. 提炼核心事实（时间、地点、主体、事件），去除所有的修饰词和情绪化表达。
2. 生成一段 80 字以内的"极简摘要"。
3. 判定该新闻对相关市场的潜在影响（利好 / 利空 / 中性）。
4. 提取新闻涉及的关键词（如：半导体、美联储、Binance、比特币等）。
请严格以 JSON 格式输出，不要包含任何 markdown 标记（如 ```json）。格式如下：
{
  "summary": "...",
  "sentiment": "利好/利空/中性",
  "keywords": ["关键词1", "关键词2"]
}"""


class BaseAIProvider:
    async def analyze(self, text: str) -> Optional[AIAnalysisResult]:
        raise NotImplementedError


class OpenAICompatibleProvider(BaseAIProvider):
    def __init__(self, api_key: str, base_url: str, model: str, provider_name: str):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.provider_name = provider_name

    async def analyze(self, text: str) -> Optional[AIAnalysisResult]:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0.1,
                max_tokens=500,
            )
            content = response.choices[0].message.content
            if not content:
                return None
            return _parse_json_response(content)
        except Exception as e:
            logger.error(f"{self.provider_name} API error: {e}")
            return None


class OpenAIProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            api_key=Config.OPENAI_API_KEY or "",
            base_url="https://api.openai.com/v1",
            model=Config.OPENAI_MODEL,
            provider_name="OpenAI",
        )


class GoogleProvider(BaseAIProvider):
    def __init__(self):
        import google.genai as genai
        self.client = genai.Client(api_key=Config.GOOGLE_API_KEY)
        self.model = Config.GOOGLE_MODEL

    async def analyze(self, text: str) -> Optional[AIAnalysisResult]:
        try:
            prompt = f"{SYSTEM_PROMPT}\n\n新闻内容：\n{text}"
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "temperature": 0.1,
                    "max_output_tokens": 500,
                },
            )
            content = response.text
            if not content:
                return None
            return _parse_json_response(content)
        except Exception as e:
            logger.error(f"Google API error: {e}")
            return None


class QwenProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            api_key=Config.QWEN_API_KEY or "",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            model=Config.QWEN_MODEL or "qwen-plus",
            provider_name="通义千问",
        )


class DeepSeekProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            api_key=Config.DEEPSEEK_API_KEY or "",
            base_url="https://api.deepseek.com/v1",
            model=Config.DEEPSEEK_MODEL or "deepseek-chat",
            provider_name="DeepSeek",
        )


class ZhipuProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            api_key=Config.ZHIPU_API_KEY or "",
            base_url="https://open.bigmodel.cn/api/paas/v4",
            model=Config.ZHIPU_MODEL or "glm-4-flash",
            provider_name="智谱AI",
        )


class MoonshotProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            api_key=Config.MOONSHOT_API_KEY or "",
            base_url="https://api.moonshot.cn/v1",
            model=Config.MOONSHOT_MODEL or "moonshot-v1-8k",
            provider_name="月之暗面",
        )


class DoubaoProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            api_key=Config.DOUBAO_API_KEY or "",
            base_url="https://ark.cn-beijing.volces.com/api/v3",
            model=Config.DOUBAO_MODEL or "doubao-1-5-pro-250528",
            provider_name="字节豆包",
        )


def _parse_json_response(content: str) -> Optional[AIAnalysisResult]:
    content = content.strip()

    json_match = re.search(r"\{[\s\S]*\}", content)
    if json_match:
        content = json_match.group(0)

    content = re.sub(r"```json\s*", "", content)
    content = re.sub(r"\s*```", "", content)
    content = content.strip()

    try:
        data = json.loads(content)
        summary = str(data.get("summary", "")).strip()
        sentiment = str(data.get("sentiment", "中性")).strip()
        keywords = data.get("keywords", [])

        if not isinstance(keywords, list):
            keywords = [str(k).strip() for k in str(keywords).split(",") if k.strip()]
        else:
            keywords = [str(k).strip() for k in keywords if str(k).strip()]

        if sentiment not in ["利好", "利空", "中性"]:
            sentiment = "中性"

        return AIAnalysisResult(
            summary=summary[:200],
            sentiment=sentiment,
            keywords=keywords[:10],
        )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response JSON: {e}, content: {content[:200]}")
        return None


class AIProcessor:
    def __init__(self):
        self.provider: Optional[BaseAIProvider] = None
        self._init_provider()

    def _init_provider(self) -> None:
        try:
            provider_map = {
                "openai": (OpenAIProvider, Config.OPENAI_API_KEY),
                "google": (GoogleProvider, Config.GOOGLE_API_KEY),
                "qwen": (QwenProvider, Config.QWEN_API_KEY),
                "deepseek": (DeepSeekProvider, Config.DEEPSEEK_API_KEY),
                "zhipu": (ZhipuProvider, Config.ZHIPU_API_KEY),
                "moonshot": (MoonshotProvider, Config.MOONSHOT_API_KEY),
                "doubao": (DoubaoProvider, Config.DOUBAO_API_KEY),
            }

            provider_class, api_key = provider_map.get(Config.AI_PROVIDER, (None, None))
            if provider_class and api_key:
                self.provider = provider_class()
                logger.info(f"Using {Config.AI_PROVIDER.upper()} as AI provider")
            else:
                for name, (cls, key) in provider_map.items():
                    if key:
                        self.provider = cls()
                        logger.info(f"Using {name.upper()} as AI provider (fallback)")
                        break
                else:
                    logger.warning("No valid AI provider configured, AI analysis will be disabled")
        except ImportError as e:
            logger.error(f"Failed to initialize AI provider: {e}")
            self.provider = None

    async def process_news(self, item: NewsItem) -> Optional[AIAnalysisResult]:
        if not self.provider:
            logger.warning("AI provider not available, skipping analysis")
            return None

        full_text = f"标题：{item.title}\n\n内容：{item.raw_content[:3000]}"
        result = await self.provider.analyze(full_text)

        if result:
            logger.info(f"Successfully analyzed news: {item.title[:30]}...")
        else:
            logger.warning(f"Failed to analyze news: {item.title[:30]}...")

        return result
