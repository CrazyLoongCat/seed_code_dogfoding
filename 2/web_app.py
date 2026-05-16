import os
import json
import threading
from datetime import datetime
from flask import Flask, render_template_string, request, redirect, url_for, jsonify, send_from_directory
from config import Config
from news_sources.factory import NewsSourceFactory
import schedule
import time

app = Flask(__name__)

CONFIG_PAGE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>财经新闻分析系统 - 配置中心</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .tab-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            background: rgba(255,255,255,0.2);
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        .tab-btn.active, .tab-btn:hover {
            background: white;
            color: #667eea;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            margin-bottom: 20px;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102,126,234,0.4); }
        .btn-success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        .btn-success:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(17,153,142,0.4); }
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        .status-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .status-card.success { border-left-color: #38ef7d; }
        .status-card.error { border-left-color: #ff6b6b; }
        .status-card.warning { border-left-color: #feca57; }
        .report-list {
            list-style: none;
        }
        .report-list li {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .report-list a {
            color: #667eea;
            text-decoration: none;
        }
        .report-list a:hover { text-decoration: underline; }
        .section-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .alert.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .alert.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 财经新闻分析系统</h1>
            <p>每日财经新闻自动分析与推送系统</p>
        </div>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showTab('dashboard')">📈 概览</button>
            <button class="tab-btn" onclick="showTab('ai')">🤖 AI配置</button>
            <button class="tab-btn" onclick="showTab('news')">📰 新闻源</button>
            <button class="tab-btn" onclick="showTab('notify')">🔔 推送配置</button>
            <button class="tab-btn" onclick="showTab('schedule')">⏰ 定时任务</button>
            <button class="tab-btn" onclick="showTab('reports')">📁 历史报告</button>
        </div>
        
        {% if message %}
        <div class="alert {{ message_type }}">{{ message }}</div>
        {% endif %}
        
        <div id="dashboard" class="tab-content active">
            <div class="card">
                <h2 class="section-title">系统状态</h2>
                <div class="status-card success">
                    <strong>运行状态:</strong> 正常运行中
                </div>
                <div class="status-card">
                    <strong>下次运行时间:</strong> {{ next_run_time }}
                </div>
                <div class="status-card">
                    <strong>最后运行时间:</strong> {{ last_run_time or '尚未运行' }}
                </div>
                <div class="status-card">
                    <strong>配置的新闻源:</strong> {{ config.NEWS_SOURCES|join(', ') }}
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-success" onclick="runNow()">立即运行一次</button>
                </div>
            </div>
        </div>
        
        <div id="ai" class="tab-content">
            <div class="card">
                <h2 class="section-title">AI 分析配置</h2>
                <form method="POST" action="/save_config">
                    <div class="form-row">
                        <div class="form-group">
                            <label>AI 提供商</label>
                            <select name="AI_PROVIDER">
                                <option value="openai" {% if config.AI_PROVIDER == 'openai' %}selected{% endif %}>OpenAI</option>
                                <option value="anthropic" {% if config.AI_PROVIDER == 'anthropic' %}selected{% endif %}>Anthropic</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>模型名称</label>
                            <input type="text" name="MODEL_NAME" value="{{ config.MODEL_NAME }}" placeholder="gpt-4-turbo-preview">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>OpenAI API Key</label>
                        <input type="password" name="OPENAI_API_KEY" value="{{ config.OPENAI_API_KEY }}" placeholder="sk-...">
                    </div>
                    <div class="form-group">
                        <label>Anthropic API Key</label>
                        <input type="password" name="ANTHROPIC_API_KEY" value="{{ config.ANTHROPIC_API_KEY }}" placeholder="sk-ant-...">
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">保存配置</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div id="news" class="tab-content">
            <div class="card">
                <h2 class="section-title">新闻源配置</h2>
                <form method="POST" action="/save_config">
                    <div class="form-group">
                        <label>启用的新闻源（用逗号分隔）</label>
                        <input type="text" name="NEWS_SOURCES" value="{{ config.NEWS_SOURCES|join(',') }}" placeholder="caulian,wallstreetcn,sina,jin10,reuters">
                        <small style="color: #666; display: block; margin-top: 5px;">
                            可用源: caulian(财联社), wallstreetcn(华尔街见闻), sina(新浪财经), jin10(金十数据), reuters(Reuters)
                        </small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>输出格式</label>
                            <select name="OUTPUT_FORMAT">
                                <option value="markdown" {% if config.OUTPUT_FORMAT == 'markdown' %}selected{% endif %}>Markdown</option>
                                <option value="json" {% if config.OUTPUT_FORMAT == 'json' %}selected{% endif %}>JSON</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>输出目录</label>
                            <input type="text" name="OUTPUT_DIR" value="{{ config.OUTPUT_DIR }}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>时区</label>
                        <input type="text" name="TIMEZONE" value="{{ config.TIMEZONE }}" placeholder="Asia/Shanghai">
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">保存配置</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div id="notify" class="tab-content">
            <div class="card">
                <h2 class="section-title">Telegram 推送</h2>
                <form method="POST" action="/save_config">
                    <div class="form-group">
                        <label>Bot Token</label>
                        <input type="password" name="TELEGRAM_BOT_TOKEN" value="{{ config.TELEGRAM_BOT_TOKEN }}" placeholder="123456:ABC-DEF...">
                    </div>
                    <div class="form-group">
                        <label>Chat ID</label>
                        <input type="text" name="TELEGRAM_CHAT_ID" value="{{ config.TELEGRAM_CHAT_ID }}" placeholder="-100123456789">
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">保存配置</button>
                        <button type="button" class="btn btn-success" onclick="testTelegram()">测试推送</button>
                    </div>
                </form>
            </div>
            
            <div class="card">
                <h2 class="section-title">飞书推送</h2>
                <form method="POST" action="/save_config">
                    <div class="form-group">
                        <label>Webhook URL</label>
                        <input type="text" name="FEISHU_WEBHOOK_URL" value="{{ config.FEISHU_WEBHOOK_URL }}" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/...">
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">保存配置</button>
                        <button type="button" class="btn btn-success" onclick="testFeishu()">测试推送</button>
                    </div>
                </form>
            </div>
            
            <div class="card">
                <h2 class="section-title">邮件推送</h2>
                <form method="POST" action="/save_config">
                    <div class="form-row">
                        <div class="form-group">
                            <label>SMTP 服务器</label>
                            <input type="text" name="EMAIL_SMTP_SERVER" value="{{ config.EMAIL_SMTP_SERVER }}" placeholder="smtp.qq.com">
                        </div>
                        <div class="form-group">
                            <label>SMTP 端口</label>
                            <input type="number" name="EMAIL_SMTP_PORT" value="{{ config.EMAIL_SMTP_PORT }}" placeholder="465">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>发件人邮箱</label>
                            <input type="email" name="EMAIL_SENDER" value="{{ config.EMAIL_SENDER }}" placeholder="xxx@qq.com">
                        </div>
                        <div class="form-group">
                            <label>邮箱授权码/密码</label>
                            <input type="password" name="EMAIL_PASSWORD" value="{{ config.EMAIL_PASSWORD }}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>收件人邮箱（多个用逗号分隔）</label>
                        <input type="text" name="EMAIL_RECEIVERS" value="{{ config.EMAIL_RECEIVERS }}" placeholder="a@example.com,b@example.com">
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">保存配置</button>
                        <button type="button" class="btn btn-success" onclick="testEmail()">测试推送</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div id="schedule" class="tab-content">
            <div class="card">
                <h2 class="section-title">定时任务配置</h2>
                <form method="POST" action="/save_config">
                    <div class="form-group">
                        <label>每日运行时间</label>
                        <input type="time" name="SCHEDULE_TIME" value="{{ config.SCHEDULE_TIME }}">
                        <small style="color: #666; display: block; margin-top: 5px;">
                            系统将在每天该时间自动运行新闻分析并推送报告
                        </small>
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">保存配置</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div id="reports" class="tab-content">
            <div class="card">
                <h2 class="section-title">历史报告</h2>
                {% if reports %}
                <ul class="report-list">
                    {% for report in reports %}
                    <li>
                        <span>{{ report }}</span>
                        <a href="/download/{{ report }}" download>下载</a>
                    </li>
                    {% endfor %}
                </ul>
                {% else %}
                <p>暂无历史报告</p>
                {% endif %}
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');
        }
        
        function runNow() {
            if (confirm('确定要立即运行一次新闻分析吗？')) {
                fetch('/run_now', {method: 'POST'})
                    .then(r => r.json())
                    .then(data => {
                        alert(data.message);
                        location.reload();
                    });
            }
        }
        
        function testTelegram() {
            fetch('/test_telegram', {method: 'POST'})
                .then(r => r.json())
                .then(data => {
                    alert(data.message);
                });
        }
        
        function testFeishu() {
            fetch('/test_feishu', {method: 'POST'})
                .then(r => r.json())
                .then(data => {
                    alert(data.message);
                });
        }
        
        function testEmail() {
            fetch('/test_email', {method: 'POST'})
                .then(r => r.json())
                .then(data => {
                    alert(data.message);
                });
        }
    </script>
</body>
</html>
"""

last_run_time = None
next_run_time = Config.SCHEDULE_TIME

def get_reports():
    if not os.path.exists(Config.OUTPUT_DIR):
        return []
    files = os.listdir(Config.OUTPUT_DIR)
    files.sort(reverse=True)
    return files

@app.route('/')
def index():
    global last_run_time, next_run_time
    return render_template_string(
        CONFIG_PAGE,
        config=Config.to_dict(),
        reports=get_reports(),
        last_run_time=last_run_time,
        next_run_time=next_run_time,
        message=request.args.get('message'),
        message_type=request.args.get('message_type', 'success')
    )

@app.route('/save_config', methods=['POST'])
def save_config():
    config_dict = request.form.to_dict()
    
    if 'NEWS_SOURCES' in config_dict:
        sources = config_dict['NEWS_SOURCES']
        config_dict['NEWS_SOURCES'] = [s.strip() for s in sources.split(',') if s.strip()]
    
    if 'EMAIL_SMTP_PORT' in config_dict:
        config_dict['EMAIL_SMTP_PORT'] = int(config_dict['EMAIL_SMTP_PORT'])
    
    Config.update_from_dict(config_dict)
    
    global next_run_time
    next_run_time = Config.SCHEDULE_TIME
    
    return redirect(url_for('index', message='配置保存成功！', message_type='success'))

@app.route('/run_now', methods=['POST'])
def run_now():
    global last_run_time
    try:
        import run_once
        run_once.main()
        last_run_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return jsonify({'success': True, 'message': '运行成功！报告已生成。'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'运行失败: {str(e)}'})

@app.route('/test_telegram', methods=['POST'])
def test_telegram():
    try:
        from notifier import Notifier
        notifier = Notifier()
        result = notifier.send_telegram("📊 测试消息\n\n这是来自财经新闻分析系统的测试消息！")
        if result:
            return jsonify({'success': True, 'message': 'Telegram 推送测试成功！'})
        else:
            return jsonify({'success': False, 'message': 'Telegram 推送测试失败，请检查配置。'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Telegram 测试异常: {str(e)}'})

@app.route('/test_feishu', methods=['POST'])
def test_feishu():
    try:
        from notifier import Notifier
        notifier = Notifier()
        result = notifier.send_feishu("测试消息", "这是来自财经新闻分析系统的测试消息！")
        if result:
            return jsonify({'success': True, 'message': '飞书推送测试成功！'})
        else:
            return jsonify({'success': False, 'message': '飞书推送测试失败，请检查配置。'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'飞书测试异常: {str(e)}'})

@app.route('/test_email', methods=['POST'])
def test_email():
    try:
        from notifier import Notifier
        notifier = Notifier()
        result = notifier.send_email("财经新闻分析系统 - 测试邮件", "这是来自财经新闻分析系统的测试邮件！")
        if result:
            return jsonify({'success': True, 'message': '邮件推送测试成功！'})
        else:
            return jsonify({'success': False, 'message': '邮件推送测试失败，请检查配置。'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'邮件测试异常: {str(e)}'})

@app.route('/download/<filename>')
def download(filename):
    return send_from_directory(Config.OUTPUT_DIR, filename, as_attachment=True)

def run_scheduler():
    import schedule
    import time
    from datetime import datetime
    
    def job():
        global last_run_time
        print(f"[{datetime.now()}] 执行定时任务...")
        try:
            import run_once
            run_once.main()
            last_run_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        except Exception as e:
            print(f"定时任务执行失败: {e}")
    
    schedule.every().day.at(Config.SCHEDULE_TIME).do(job)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == '__main__':
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    print("Web配置界面已启动，请访问 http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
