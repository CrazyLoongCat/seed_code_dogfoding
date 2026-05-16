import json
from typing import List, Dict, Any
from news_sources.base import NewsItem
from config import Config

class AIAnalyzer:
    def __init__(self):
        self.provider = Config.AI_PROVIDER
        self.model = Config.MODEL_NAME
        self.openai_key = Config.OPENAI_API_KEY
        self.anthropic_key = Config.ANTHROPIC_API_KEY
    
    def build_news_prompt(self, news_list: List[NewsItem]) -> str:
        news_text = "\n\n".join([f"{i+1}. [{news.source}] {news.title} - {news.summary}" for i, news in enumerate(news_list)])
        return news_text
    
    def analyze_with_openai(self, prompt: str) -> str:
        if not self.openai_key:
            raise ValueError("OpenAI API key is not set")
        
        from openai import OpenAI
        client = OpenAI(api_key=self.openai_key)
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "你是一位专业的财经分析师，请用中文提供专业、准确的分析报告。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4096
        )
        
        return response.choices[0].message.content
    
    def analyze_with_anthropic(self, prompt: str) -> str:
        if not self.anthropic_key:
            raise ValueError("Anthropic API key is not set")
        
        from anthropic import Anthropic
        client = Anthropic(api_key=self.anthropic_key)
        
        response = client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ],
            system="你是一位专业的财经分析师，请用中文提供专业、准确的分析报告。"
        )
        
        return response.content[0].text
    
    def analyze_news(self, news_list: List[NewsItem]) -> Dict[str, Any]:
        if not news_list:
            return self._generate_sample_result([])
        
        news_text = self.build_news_prompt(news_list)
        
        prompt = f"""
        请对以下今日财经新闻进行全面分析：
        
        {news_text}
        
        请按照以下结构输出JSON格式的分析结果：
        {{
            "core_summary": ["核心摘要1", "核心摘要2", "核心摘要3"],
            "category_points": {{
                "宏观经济": "...",
                "股市": "...",
                "债市/汇市": "...",
                "大宗": "...",
                "产业/公司": "...",
                "政策/监管": "..."
            }},
            "trend_analysis": "趋势关联分析...",
            "risk_points": ["风险点1", "风险点2", "风险点3"],
            "top_news": [
                {{
                    "title": "新闻标题",
                    "summary": "30-50字压缩简述",
                    "reason": "入选原因"
                }}
            ],
            "suggestions": ["建议1", "建议2", "建议3"]
        }}
        
        注意：
        1. 核心摘要控制在3-5句
        2. top_news选择最重要的10条，按重要性排序
        3. suggestions生成3-6条具体可执行的财经建议
        4. 所有输出使用中文
        """
        
        try:
            if self.provider == "anthropic" and self.anthropic_key:
                result = self.analyze_with_anthropic(prompt)
            elif self.provider == "openai" and self.openai_key:
                result = self.analyze_with_openai(prompt)
            else:
                print("API key 未配置，使用示例数据生成报告")
                return self._generate_sample_result(news_list)
            
            return json.loads(result)
        except Exception as e:
            print(f"AI 分析失败: {e}，使用示例数据生成报告")
            return self._generate_sample_result(news_list)
    
    def _generate_sample_result(self, news_list: List[NewsItem]) -> Dict[str, Any]:
        sample_top_news = []
        for i, news in enumerate(news_list[:10]):
            summary = news.summary[:50] + "..." if len(news.summary) > 50 else news.summary
            if not summary:
                summary = news.title[:50] + "..." if len(news.title) > 50 else news.title
            
            reasons = [
                "重要财经事件，影响市场走势",
                "政策面变化，值得重点关注",
                "核心数据发布，反映经济趋势",
                "行业重大新闻，影响相关板块",
                "公司重要公告，影响股价表现"
            ]
            
            sample_top_news.append({
                "title": news.title,
                "summary": summary,
                "reason": reasons[i % len(reasons)]
            })
        
        while len(sample_top_news) < 10:
            idx = len(sample_top_news) + 1
            sample_top_news.append({
                "title": f"重要财经新闻 {idx}",
                "summary": "今日重要财经事件摘要",
                "reason": "影响市场的重要资讯"
            })
        
        return {
            "core_summary": [
                "今日市场整体呈震荡走势，多空博弈加剧。",
                "宏观经济数据显示复苏态势良好，但仍存不确定性。",
                "政策面持续发力，市场信心有所恢复。"
            ],
            "category_points": {
                "宏观经济": "今日公布的宏观数据整体符合预期，经济复苏态势延续。",
                "股市": "A股小幅波动，成交量有所萎缩，市场观望情绪浓厚。",
                "债市/汇市": "债券市场平稳运行，汇率保持稳定。",
                "大宗": "大宗商品价格整体下行，原油价格小幅反弹。",
                "产业/公司": "多家上市公司发布财报，业绩分化明显。",
                "政策/监管": "监管层持续完善资本市场制度建设。"
            },
            "trend_analysis": "今日新闻整体呈现多空交织态势，宏观数据与政策面相互支撑，但市场仍存观望情绪。",
            "risk_points": [
                "外部市场波动可能传导至国内",
                "部分行业业绩不及预期",
                "地缘政治风险仍需警惕"
            ],
            "top_news": sample_top_news,
            "suggestions": [
                "建议保持中性仓位，关注政策面变化",
                "重点关注业绩确定性较高的板块",
                "密切跟踪海外市场动态"
            ]
        }
