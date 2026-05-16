import os
import random
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    AI_PROVIDER: str = os.environ.get("AI_PROVIDER", "openai").lower()

    OPENAI_API_KEY: str | None = os.environ.get("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    GOOGLE_API_KEY: str | None = os.environ.get("GOOGLE_API_KEY")
    GOOGLE_MODEL: str = os.environ.get("GOOGLE_MODEL", "gemini-1.5-flash")

    QWEN_API_KEY: str | None = os.environ.get("QWEN_API_KEY")
    QWEN_MODEL: str = os.environ.get("QWEN_MODEL", "qwen-plus")

    DEEPSEEK_API_KEY: str | None = os.environ.get("DEEPSEEK_API_KEY")
    DEEPSEEK_MODEL: str = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

    ZHIPU_API_KEY: str | None = os.environ.get("ZHIPU_API_KEY")
    ZHIPU_MODEL: str = os.environ.get("ZHIPU_MODEL", "glm-4-flash")

    MOONSHOT_API_KEY: str | None = os.environ.get("MOONSHOT_API_KEY")
    MOONSHOT_MODEL: str = os.environ.get("MOONSHOT_MODEL", "moonshot-v1-8k")

    DOUBAO_API_KEY: str | None = os.environ.get("DOUBAO_API_KEY")
    DOUBAO_MODEL: str = os.environ.get("DOUBAO_MODEL", "doubao-1-5-pro-250528")

    NEWS_SOURCE_URL: str = os.environ.get(
        "NEWS_SOURCE_URL", "https://example-finance-site.com/news/roll"
    )
    ROBOTS_TXT_URL: str = os.environ.get(
        "ROBOTS_TXT_URL", "https://example-finance-site.com/robots.txt"
    )
    USER_AGENTS_FILE: str = os.environ.get("USER_AGENTS_FILE", "user_agents.txt")

    DB_PATH: str = os.environ.get("DB_PATH", "financial_news.db")

    FETCH_INTERVAL_MINUTES: int = int(os.environ.get("FETCH_INTERVAL_MINUTES", "15"))
    REQUEST_DELAY_MIN: int = int(os.environ.get("REQUEST_DELAY_MIN", "3"))
    REQUEST_DELAY_MAX: int = int(os.environ.get("REQUEST_DELAY_MAX", "7"))
    MAX_NEWS_PER_RUN: int = int(os.environ.get("MAX_NEWS_PER_RUN", "20"))

    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.environ.get("LOG_FILE", "news_crawler.log")

    _user_agents: list[str] | None = None

    @classmethod
    def get_random_user_agent(cls) -> str:
        if cls._user_agents is None:
            cls._load_user_agents()
        return random.choice(cls._user_agents) if cls._user_agents else "Mozilla/5.0"

    @classmethod
    def _load_user_agents(cls) -> None:
        try:
            path = Path(cls.USER_AGENTS_FILE)
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    cls._user_agents = [
                        line.strip() for line in f if line.strip()
                    ]
            else:
                cls._user_agents = []
        except Exception:
            cls._user_agents = []

    @classmethod
    def get_request_delay(cls) -> float:
        return random.uniform(cls.REQUEST_DELAY_MIN, cls.REQUEST_DELAY_MAX)
