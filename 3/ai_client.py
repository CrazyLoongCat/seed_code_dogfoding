import os
import random
from typing import Tuple
from dataclasses import dataclass


@dataclass
class AnalysisResult:
    summary: str
    sentiment: str
    sentiment_score: float


class AIClient:
    def __init__(self, mode: str = "mock", api_key: str = None, model: str = "gpt-3.5-turbo"):
        self.mode = mode
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.model = model

    def analyze(self, text: str) -> AnalysisResult:
        if self.mode == "real" and self.api_key:
            return self._real_analyze(text)
        return self._mock_analyze(text)

    def _mock_analyze(self, text: str) -> AnalysisResult:
        text_lower = text.lower()

        positive_words = ["优秀", "出色", "精彩", "完美", "成功", "创新", "突破", "领先", "优质", "高效",
                         "great", "excellent", "amazing", "wonderful", "perfect", "success", "innovative"]
        negative_words = ["失败", "糟糕", "困难", "危机", "下滑", "亏损", "裁员", "衰退", "风险", "争议",
                         "bad", "terrible", "failed", "crisis", "decline", "loss", "risk", "problem"]

        positive_count = sum(1 for w in positive_words if w in text_lower)
        negative_count = sum(1 for w in negative_words if w in text_lower)

        if positive_count > negative_count:
            sentiment = "正面"
            score = random.uniform(0.6, 0.95)
        elif negative_count > positive_count:
            sentiment = "负面"
            score = random.uniform(0.05, 0.4)
        else:
            sentiment = "中性"
            score = random.uniform(0.4, 0.6)

        sentences = [s.strip() for s in text.replace("\n", " ").split("。") if s.strip()]
        if len(sentences) >= 3:
            summary = "。".join(sentences[:3]) + "。"
        elif len(sentences) >= 1:
            summary = sentences[0] + "。"
        else:
            summary = text[:100]

        if len(summary) > 100:
            summary = summary[:97] + "..."

        return AnalysisResult(
            summary=summary,
            sentiment=sentiment,
            sentiment_score=round(score, 2)
        )

    def _real_analyze(self, text: str) -> AnalysisResult:
        try:
            import openai
            openai.api_key = self.api_key

            truncated_text = text[:8000] if len(text) > 8000 else text

            prompt = f"""请对以下文本执行两个任务：
1. 生成一个简洁摘要（50-100字）
2. 判断整体情感倾向（正面/负面/中性）并给出0-1的情感分数

文本：
{truncated_text}

请严格按以下JSON格式返回：
{{
    "summary": "摘要内容",
    "sentiment": "正面|负面|中性",
    "sentiment_score": 0.75
}}"""

            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的文本分析助手。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )

            import json
            result_text = response.choices[0].message.content.strip()
            result_json = json.loads(result_text)

            return AnalysisResult(
                summary=result_json.get("summary", ""),
                sentiment=result_json.get("sentiment", "中性"),
                sentiment_score=float(result_json.get("sentiment_score", 0.5))
            )
        except Exception as e:
            print(f"OpenAI API 调用失败，切换到模拟模式: {e}")
            return self._mock_analyze(text)
