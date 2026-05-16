import os
import json
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
    
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
    
    FEISHU_WEBHOOK_URL = os.getenv("FEISHU_WEBHOOK_URL", "")
    
    EMAIL_SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER", "smtp.qq.com")
    EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "465"))
    EMAIL_SENDER = os.getenv("EMAIL_SENDER", "")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
    EMAIL_RECEIVERS = os.getenv("EMAIL_RECEIVERS", "")
    
    @staticmethod
    def ensure_output_dir():
        os.makedirs(Config.OUTPUT_DIR, exist_ok=True)
    
    @staticmethod
    def to_dict():
        return {
            "OPENAI_API_KEY": Config.OPENAI_API_KEY,
            "ANTHROPIC_API_KEY": Config.ANTHROPIC_API_KEY,
            "NEWS_SOURCES": ",".join(Config.NEWS_SOURCES),
            "SCHEDULE_TIME": Config.SCHEDULE_TIME,
            "TIMEZONE": Config.TIMEZONE,
            "OUTPUT_FORMAT": Config.OUTPUT_FORMAT,
            "OUTPUT_DIR": Config.OUTPUT_DIR,
            "AI_PROVIDER": Config.AI_PROVIDER,
            "MODEL_NAME": Config.MODEL_NAME,
            "TELEGRAM_BOT_TOKEN": Config.TELEGRAM_BOT_TOKEN,
            "TELEGRAM_CHAT_ID": Config.TELEGRAM_CHAT_ID,
            "FEISHU_WEBHOOK_URL": Config.FEISHU_WEBHOOK_URL,
            "EMAIL_SMTP_SERVER": Config.EMAIL_SMTP_SERVER,
            "EMAIL_SMTP_PORT": Config.EMAIL_SMTP_PORT,
            "EMAIL_SENDER": Config.EMAIL_SENDER,
            "EMAIL_PASSWORD": Config.EMAIL_PASSWORD,
            "EMAIL_RECEIVERS": Config.EMAIL_RECEIVERS
        }
    
    @staticmethod
    def update_from_dict(config_dict: dict):
        env_content = []
        current_config = Config.to_dict()
        
        for key, value in config_dict.items():
            if hasattr(Config, key):
                setattr(Config, key, value)
                env_content.append(f"{key}={value}")
        
        for key, value in current_config.items():
            if key not in config_dict:
                env_content.append(f"{key}={value}")
        
        with open(".env", "w", encoding="utf-8") as f:
            f.write("\n".join(env_content))
