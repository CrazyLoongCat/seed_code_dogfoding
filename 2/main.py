import asyncio
import schedule
import time
from datetime import datetime
from config import Config
from news_sources.factory import NewsSourceFactory
from news_sources.base import NewsItem
from news_cleaner import NewsCleaner
from ai_analyzer import AIAnalyzer
from report_generator import ReportGenerator
from notifier import Notifier

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

def run_daily_analysis():
    print(f"开始执行每日财经新闻分析任务... {datetime.now()}")
    
    news_list = asyncio.run(fetch_all_news())
    print(f"共获取新闻: {len(news_list)} 条")
    
    cleaned_news = NewsCleaner.clean_and_preprocess(news_list, Config.TIMEZONE)
    print(f"清洗后剩余新闻: {len(cleaned_news)} 条")
    
    if not cleaned_news:
        cleaned_news = news_list[:20]
        print("使用原始新闻数据进行分析")
    
    analyzer = AIAnalyzer()
    analysis_result = analyzer.analyze_news(cleaned_news)
    
    analysis_result['date'] = datetime.now().strftime("%Y-%m-%d")
    
    filepath = ReportGenerator.save_report(analysis_result)
    print(f"报告已生成: {filepath}")
    
    notifier = Notifier()
    push_results = notifier.send_all(analysis_result, filepath)
    print(f"推送结果: {push_results}")
    
    print("每日财经新闻分析任务完成")

def main():
    print("每日财经新闻自动分析系统启动")
    print(f"配置的新闻源: {Config.NEWS_SOURCES}")
    print(f"计划运行时间: {Config.SCHEDULE_TIME}")
    print(f"输出格式: {Config.OUTPUT_FORMAT}")
    
    schedule.every().day.at(Config.SCHEDULE_TIME).do(run_daily_analysis)
    
    print("等待定时任务执行...")
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main()
