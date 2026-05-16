import asyncio
import logging
import signal
import sys
import threading
import uvicorn
from logging.handlers import RotatingFileHandler
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import Config
from database import DatabaseManager, NewsItem
from crawler import NewsCrawler, RawNews
from ai_processor import AIProcessor
from api import app


def setup_logging() -> None:
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    formatter = logging.Formatter(log_format)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO))

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    file_handler = RotatingFileHandler(
        Config.LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)


logger = logging.getLogger(__name__)


class NewsOrchestrator:
    def __init__(self):
        self.db = DatabaseManager()
        self.ai_processor = AIProcessor()
        self._shutdown = False

    async def run_full_pipeline(self) -> None:
        if self._shutdown:
            return

        logger.info("=" * 60)
        logger.info(f"Starting news pipeline at {datetime.now().isoformat()}")
        logger.info("=" * 60)

        stats = {
            "fetched": 0,
            "new": 0,
            "duplicate": 0,
            "ai_success": 0,
            "ai_failed": 0,
        }

        try:
            async with NewsCrawler() as crawler:
                sources = self.db.get_news_sources(enabled_only=True)
                logger.info(f"Found {len(sources)} enabled news sources")
                raw_news_list = await crawler.fetch_from_all_sources(sources)
                stats["fetched"] = len(raw_news_list)
                logger.info(f"Fetched {len(raw_news_list)} news items from all sources")

                for raw_news in raw_news_list:
                    try:
                        item = NewsCrawler.raw_news_to_item(raw_news)

                        if self.db.exists(item.news_md5):
                            stats["duplicate"] += 1
                            logger.debug(f"Duplicate news, skipping: {item.title[:30]}...")
                            continue

                        if not self.db.insert_raw_news(item):
                            logger.warning(f"Failed to insert news: {item.title[:30]}...")
                            continue

                        stats["new"] += 1
                        logger.info(f"New news saved: {item.title[:50]}...")

                    except Exception as e:
                        logger.error(f"Error processing raw news: {e}")
                        continue

        except Exception as e:
            logger.error(f"Error in crawling phase: {e}")

        try:
            pending_news = self.db.get_pending_ai_news(limit=Config.MAX_NEWS_PER_RUN)
            logger.info(f"Found {len(pending_news)} news items pending AI analysis")

            for item in pending_news:
                if self._shutdown:
                    break
                try:
                    result = await self.ai_processor.process_news(item)
                    if result:
                        success = self.db.update_ai_analysis(
                            news_md5=item.news_md5,
                            ai_summary=result.summary,
                            sentiment=result.sentiment,
                            keywords=result.keywords,
                        )
                        if success:
                            stats["ai_success"] += 1
                            logger.info(
                                f"AI analysis saved [{result.sentiment}]: {item.title[:30]}..."
                            )
                        else:
                            stats["ai_failed"] += 1
                    else:
                        stats["ai_failed"] += 1

                except Exception as e:
                    stats["ai_failed"] += 1
                    logger.error(f"Error in AI processing for {item.news_md5}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error in AI processing phase: {e}")

        logger.info("-" * 60)
        logger.info("Pipeline Statistics:")
        logger.info(f"  Fetched from source: {stats['fetched']}")
        logger.info(f"  New news saved: {stats['new']}")
        logger.info(f"  Duplicate skipped: {stats['duplicate']}")
        logger.info(f"  AI analysis success: {stats['ai_success']}")
        logger.info(f"  AI analysis failed: {stats['ai_failed']}")
        logger.info("=" * 60)

    def shutdown(self) -> None:
        logger.info("Shutdown signal received, stopping orchestrator...")
        self._shutdown = True


class WebServer(threading.Thread):
    def __init__(self, host: str = "0.0.0.0", port: int = 8000):
        super().__init__(daemon=True)
        self.host = host
        self.port = port
        self.server = None

    def run(self) -> None:
        config = uvicorn.Config(
            app,
            host=self.host,
            port=self.port,
            log_level="warning",
        )
        self.server = uvicorn.Server(config)
        logger.info(f"Web server starting on http://{self.host}:{self.port}")
        self.server.run()

    def stop(self) -> None:
        if self.server:
            self.server.should_exit = True


async def main() -> None:
    setup_logging()
    logger.info("=" * 60)
    logger.info("AI Financial News Intelligence Station starting...")
    logger.info("=" * 60)

    orchestrator = NewsOrchestrator()

    scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")

    trigger = IntervalTrigger(minutes=Config.FETCH_INTERVAL_MINUTES)
    scheduler.add_job(
        orchestrator.run_full_pipeline,
        trigger=trigger,
        id="news_pipeline",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    web_server = WebServer(host="0.0.0.0", port=8000)
    web_server.start()

    logger.info(f"Scheduler configured to run every {Config.FETCH_INTERVAL_MINUTES} minutes")
    logger.info(f"Web interface available at: http://localhost:8000")

    def handle_shutdown(signum, frame):
        orchestrator.shutdown()
        scheduler.shutdown(wait=False)
        web_server.stop()
        logger.info("Shutdown complete")

    try:
        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)
    except (AttributeError, ValueError):
        pass

    scheduler.start()
    logger.info("Scheduler started, running first pipeline immediately...")

    try:
        await orchestrator.run_full_pipeline()
    except Exception as e:
        logger.error(f"First pipeline run failed: {e}")

    logger.info("Press Ctrl+C to exit")
    try:
        while not orchestrator._shutdown:
            await asyncio.sleep(1)
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass
    finally:
        if scheduler.running:
            scheduler.shutdown()
        web_server.stop()
        logger.info("Application exited gracefully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application crashed: {e}", exc_info=True)
        sys.exit(1)
