import os
import json
from datetime import datetime
from typing import Dict, Any
from config import Config

class ReportGenerator:
    @staticmethod
    def generate_markdown_report(analysis_result: Dict[str, Any]) -> str:
        today = datetime.now().strftime("%Y-%m-%d")
        
        markdown = f"# 📅 {today} 财经新闻自动分析报告\n\n"
        
        markdown += "## 📌 核心摘要\n"
        for i, summary in enumerate(analysis_result.get("core_summary", []), 1):
            markdown += f"{i}. {summary}\n"
        markdown += "\n"
        
        markdown += "## 📂 分类要点\n"
        category_points = analysis_result.get("category_points", {})
        categories = ["宏观经济", "股市", "债市/汇市", "大宗", "产业/公司", "政策/监管"]
        for category in categories:
            content = category_points.get(category, "")
            if content:
                markdown += f"- **{category}**：{content}\n"
        markdown += "\n"
        
        markdown += "## 🔟 今日十大财经新闻\n"
        for i, news in enumerate(analysis_result.get("top_news", []), 1):
            markdown += f"{i}. **{news.get('title', '')}**\n"
            markdown += f"    - 简述：{news.get('summary', '')}\n"
            markdown += f"    - 重要原因：{news.get('reason', '')}\n"
        markdown += "\n"
        
        markdown += "## 💡 财经建议\n"
        for i, suggestion in enumerate(analysis_result.get("suggestions", []), 1):
            markdown += f"{i}. {suggestion}\n"
        markdown += "\n"
        
        markdown += "## ⚠️ 风险提示\n"
        for risk in analysis_result.get("risk_points", []):
            markdown += f"- {risk}\n"
        
        return markdown
    
    @staticmethod
    def generate_json_report(analysis_result: Dict[str, Any]) -> str:
        today = datetime.now().strftime("%Y-%m-%d")
        report = {
            "date": today,
            "core_summary": analysis_result.get("core_summary", []),
            "category_points": analysis_result.get("category_points", {}),
            "top_news": analysis_result.get("top_news", []),
            "suggestions": analysis_result.get("suggestions", []),
            "risk_points": analysis_result.get("risk_points", []),
            "trend_analysis": analysis_result.get("trend_analysis", "")
        }
        return json.dumps(report, ensure_ascii=False, indent=2)
    
    @staticmethod
    def save_report(analysis_result: Dict[str, Any]) -> str:
        Config.ensure_output_dir()
        today = datetime.now().strftime("%Y-%m-%d")
        
        if Config.OUTPUT_FORMAT == "json":
            content = ReportGenerator.generate_json_report(analysis_result)
            filename = f"{today}_financial_report.json"
        else:
            content = ReportGenerator.generate_markdown_report(analysis_result)
            filename = f"{today}_financial_report.md"
        
        filepath = os.path.join(Config.OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath
