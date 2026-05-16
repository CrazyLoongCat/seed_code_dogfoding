import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import requests
from config import Config


class Notifier:
    def __init__(self):
        self.telegram_token = Config.TELEGRAM_BOT_TOKEN
        self.telegram_chat_id = Config.TELEGRAM_CHAT_ID
        self.feishu_webhook = Config.FEISHU_WEBHOOK_URL
        self.email_smtp_server = Config.EMAIL_SMTP_SERVER
        self.email_smtp_port = Config.EMAIL_SMTP_PORT
        self.email_sender = Config.EMAIL_SENDER
        self.email_password = Config.EMAIL_PASSWORD
        self.email_receivers = Config.EMAIL_RECEIVERS
    
    def send_telegram(self, message: str) -> bool:
        if not self.telegram_token or not self.telegram_chat_id:
            print("Telegram 配置不完整，跳过发送")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            data = {
                "chat_id": self.telegram_chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True
            }
            response = requests.post(url, data=data, timeout=10)
            result = response.json()
            if result.get("ok"):
                print("Telegram 消息发送成功")
                return True
            else:
                print(f"Telegram 消息发送失败: {result}")
                return False
        except Exception as e:
            print(f"Telegram 发送异常: {e}")
            return False
    
    def send_feishu(self, title: str, content: str) -> bool:
        if not self.feishu_webhook:
            print("飞书 Webhook 未配置，跳过发送")
            return False
        
        try:
            data = {
                "msg_type": "interactive",
                "card": {
                    "config": {"wide_screen_mode": True},
                    "header": {
                        "title": {"tag": "plain_text", "content": title},
                        "template": "blue"
                    },
                    "elements": [
                        {
                            "tag": "markdown",
                            "content": content
                        }
                    ]
                }
            }
            response = requests.post(self.feishu_webhook, json=data, timeout=10)
            result = response.json()
            if result.get("code") == 0:
                print("飞书消息发送成功")
                return True
            else:
                print(f"飞书消息发送失败: {result}")
                return False
        except Exception as e:
            print(f"飞书发送异常: {e}")
            return False
    
    def send_email(self, subject: str, content: str) -> bool:
        if not all([self.email_smtp_server, self.email_sender, self.email_password, self.email_receivers]):
            print("邮件配置不完整，跳过发送")
            return False
        
        try:
            receivers = self.email_receivers.split(",") if isinstance(self.email_receivers, str) else self.email_receivers
            
            msg = MIMEMultipart()
            msg["From"] = Header(self.email_sender)
            msg["To"] = Header(",".join(receivers))
            msg["Subject"] = Header(subject, "utf-8")
            
            msg.attach(MIMEText(content, "markdown", "utf-8"))
            
            server = smtplib.SMTP_SSL(self.email_smtp_server, self.email_smtp_port)
            server.login(self.email_sender, self.email_password)
            server.sendmail(self.email_sender, receivers, msg.as_string())
            server.quit()
            
            print("邮件发送成功")
            return True
        except Exception as e:
            print(f"邮件发送异常: {e}")
            return False
    
    def send_all(self, analysis_result: dict, report_path: str) -> dict:
        results = {
            "telegram": False,
            "feishu": False,
            "email": False
        }
        
        summary = self._build_summary_message(analysis_result)
        title = f"📅 {analysis_result.get('date', '')} 财经新闻分析报告"
        
        if self.telegram_token and self.telegram_chat_id:
            results["telegram"] = self.send_telegram(f"{title}\n\n{summary}")
        
        if self.feishu_webhook:
            results["feishu"] = self.send_feishu(title, summary)
        
        if self.email_sender and self.email_password and self.email_receivers:
            email_content = self._build_email_content(analysis_result, summary)
            results["email"] = self.send_email(title, email_content)
        
        return results
    
    def _build_summary_message(self, analysis_result: dict) -> str:
        lines = []
        
        lines.append("## 📌 核心摘要")
        for i, summary in enumerate(analysis_result.get("core_summary", []), 1):
            lines.append(f"{i}. {summary}")
        lines.append("")
        
        lines.append("## 🔝 十大新闻")
        for i, news in enumerate(analysis_result.get("top_news", [])[:5], 1):
            lines.append(f"{i}. **{news.get('title', '')}**")
        lines.append("")
        
        lines.append("## 💡 财经建议")
        for i, suggestion in enumerate(analysis_result.get("suggestions", []), 1):
            lines.append(f"{i}. {suggestion}")
        lines.append("")
        
        lines.append("## ⚠️ 风险提示")
        for risk in analysis_result.get("risk_points", []):
            lines.append(f"- {risk}")
        
        return "\n".join(lines)
    
    def _build_email_content(self, analysis_result: dict, summary: str) -> str:
        content = f"""
{summary}

---
此邮件由每日财经新闻自动分析系统自动发送。
"""
        return content
