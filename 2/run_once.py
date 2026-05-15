import asyncio
import sys
import io
from datetime import datetime
from config import Config
from news_sources.factory import NewsSourceFactory
from news_cleaner import NewsCleaner
from ai_analyzer import AIAnalyzer
from report_generator import ReportGenerator

async def fetch_all_news() -> list:
    all_news = []
    sources = Config.NEWS_SOURCES
    
    for source_name in sources:
        try:
            source = NewsSourceFactory.get_source(source_name)
            news = await source.fetch_news()
            all_news.extend(news)
            print(f"成功获取 {source.get_name()} 新闻: {len(news)} 条")
        except Exception as e:
            print(f"获取 {source_name} 新闻失败: {e}")
    
    return all_news

def main():
    print(f"开始执行单次财经新闻分析... {datetime.now()}")
    
    news_list = asyncio.run(fetch_all_news())
    print(f"共获取新闻: {len(news_list)} 条")
    
    cleaned_news = NewsCleaner.clean_and_preprocess(news_list, Config.TIMEZONE)
    print(f"清洗后剩余新闻: {len(cleaned_news)} 条")
    
    if not cleaned_news:
        cleaned_news = news_list[:20]
        print("使用原始新闻数据进行分析")
    
    analyzer = AIAnalyzer()
    analysis_result = analyzer.analyze_news(cleaned_news)
    
    filepath = ReportGenerator.save_report(analysis_result)
    print(f"报告已生成: {filepath}")
    
    print("分析完成！")

if __name__ == "__main__":
    main()
