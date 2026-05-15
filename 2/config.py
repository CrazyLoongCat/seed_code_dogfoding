import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    
    NEWS_SOURCES = os.getenv("NEWS_SOURCES", "caulian,wallstreetcn,sina,jin10").split(",")
    
    SCHEDULE_TIME = os.getenv("SCHEDULE_TIME", "20:00")
    TIMEZONE = os.getenv("TIMEZONE", "Asia/Shanghai")
    
    OUTPUT_FORMAT = os.getenv("OUTPUT_FORMAT", "markdown")
    OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./output")
    
    AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")
    MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4-turbo-preview")
    
    @staticmethod
    def ensure_output_dir():
        os.makedirs(Config.OUTPUT_DIR, exist_ok=True)
