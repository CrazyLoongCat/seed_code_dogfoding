import sys
import os
from pathlib import Path


def check_python_version():
    print("=" * 60)
    print("1. 检查 Python 版本")
    print("-" * 60)
    version = sys.version_info
    print(f"当前版本: Python {version.major}.{version.minor}.{version.micro}")
    if version.major >= 3 and version.minor >= 10:
        print("✓ Python 版本符合要求 (>= 3.10+)")
        return True
    else:
        print("✗ Python 版本过低，需要 3.10+")
        return False


def check_dependencies():
    print("\n" + "=" * 60)
    print("2. 检查依赖包")
    print("-" * 60)
    required = {
        "httpx": "httpx",
        "bs4": "beautifulsoup4",
        "lxml": "lxml",
        "dotenv": "python-dotenv",
        "openai": "openai",
        "google.genai": "google-genai",
        "apscheduler": "APScheduler",
    }

    all_ok = True
    for import_name, pkg_name in required.items():
        try:
            __import__(import_name)
            print(f"✓ {pkg_name} 已安装")
        except ImportError:
            print(f"✗ {pkg_name} 未安装")
            all_ok = False

    if not all_ok:
        print(f"\n请运行: pip install -r requirements.txt")
    return all_ok


def check_env_file():
    print("\n" + "=" * 60)
    print("3. 检查环境变量配置")
    print("-" * 60)

    env_path = Path(".env")
    if not env_path.exists():
        print("⚠ 未找到 .env 文件，将使用 .env.example 作为模板")
        print("  请复制 .env.example 为 .env 并填入真实配置")
        return False

    from dotenv import load_dotenv
    load_dotenv()

    checks = [
        ("AI_PROVIDER", os.environ.get("AI_PROVIDER")),
        ("数据库路径 (DB_PATH)", os.environ.get("DB_PATH", "financial_news.db")),
        ("新闻源 URL (NEWS_SOURCE_URL)", os.environ.get("NEWS_SOURCE_URL")),
    ]

    for name, value in checks:
        status = "✓" if value else "⚠"
        print(f"{status} {name}: {value or '未设置'}")

    ai_provider = os.environ.get("AI_PROVIDER", "openai").lower()
    if ai_provider == "google":
        api_key = os.environ.get("GOOGLE_API_KEY")
        if api_key:
            print(f"✓ Google API Key 已配置")
        else:
            print(f"✗ Google API Key 未配置")
            return False
    elif ai_provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            print(f"✓ OpenAI API Key 已配置")
        else:
            print(f"✗ OpenAI API Key 未配置")
            return False

    return True


def check_database():
    print("\n" + "=" * 60)
    print("4. 测试数据库初始化")
    print("-" * 60)
    try:
        import tempfile
        import os
        from database import DatabaseManager

        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            temp_db_path = f.name

        try:
            db = DatabaseManager(temp_db_path)
            print("✓ 数据库初始化成功")

            from database import NewsItem
            test_item = NewsItem(
                news_md5="test123",
                title="测试新闻",
                publish_time="2024-01-01",
                source_url="https://example.com",
                raw_content="测试内容",
            )
            if db.insert_raw_news(test_item):
                print("✓ 数据插入测试成功")
            if db.exists("test123"):
                print("✓ 去重检查测试成功")
            return True
        finally:
            if os.path.exists(temp_db_path):
                os.unlink(temp_db_path)
    except Exception as e:
        print(f"✗ 数据库测试失败: {e}")
        return False


def check_config():
    print("\n" + "=" * 60)
    print("5. 测试配置加载")
    print("-" * 60)
    try:
        from config import Config
        print(f"✓ User-Agent: {Config.get_random_user_agent()[:50]}...")
        print(f"✓ 请求延迟范围: {Config.REQUEST_DELAY_MIN}-{Config.REQUEST_DELAY_MAX} 秒")
        print(f"✓ 抓取间隔: {Config.FETCH_INTERVAL_MINUTES} 分钟")
        return True
    except Exception as e:
        print(f"✗ 配置加载失败: {e}")
        return False


def check_crawler():
    print("\n" + "=" * 60)
    print("6. 测试爬虫模块")
    print("-" * 60)
    try:
        from crawler import NewsCrawler

        test_md5 = NewsCrawler._generate_md5("测试标题", "2024-01-01 12:00")
        print(f"✓ MD5 生成测试成功: {test_md5}")

        test_html = """
        <html><body>
        <div class="article-content">
        <p>这是新闻正文内容，包含重要财经信息。</p>
        <script>alert('test')</script>
        </div></body></html>
        """
        crawler = NewsCrawler()
        content = crawler._parse_news_content(test_html)
        if "财经信息" in content:
            print("✓ HTML 内容解析测试成功")
        else:
            print("⚠ HTML 内容解析可能有问题")
        return True
    except Exception as e:
        print(f"✗ 爬虫模块测试失败: {e}")
        return False


def check_ai_processor():
    print("\n" + "=" * 60)
    print("7. 测试 AI 处理模块")
    print("-" * 60)
    try:
        from ai_processor import _parse_json_response

        test_response = """```json
        {
          "summary": "这是测试摘要",
          "sentiment": "利好",
          "keywords": ["测试", "财经"]
        }
        ```"""
        result = _parse_json_response(test_response)
        if result and result.sentiment == "利好":
            print("✓ JSON 解析测试成功 (含 markdown 标记)")
            print(f"  摘要: {result.summary}")
            print(f"  情感: {result.sentiment}")
            print(f"  关键词: {result.keywords}")
        else:
            print("✗ JSON 解析测试失败")
            return False

        test_response2 = '{"summary": "测试", "sentiment": "中性", "keywords": ["A", "B"]}'
        result2 = _parse_json_response(test_response2)
        if result2 and result2.sentiment == "中性":
            print("✓ JSON 解析测试成功 (纯 JSON)")
        else:
            print("✗ JSON 解析测试失败")
            return False

        return True
    except Exception as e:
        print(f"✗ AI 处理模块测试失败: {e}")
        return False


def main():
    print("\n" + "=" * 60)
    print("AI 财经新闻情报站 - 环境验证脚本")
    print("=" * 60)

    results = []
    results.append(("Python 版本", check_python_version()))
    results.append(("依赖包", check_dependencies()))
    results.append(("环境变量", check_env_file()))
    results.append(("数据库", check_database()))
    results.append(("配置加载", check_config()))
    results.append(("爬虫模块", check_crawler()))
    results.append(("AI 处理", check_ai_processor()))

    print("\n" + "=" * 60)
    print("验证结果汇总")
    print("-" * 60)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)

    for name, ok in results:
        status = "✓ 通过" if ok else "✗ 失败"
        print(f"{status} - {name}")

    print("-" * 60)
    print(f"总计: {passed}/{total} 项通过")

    if passed == total:
        print("\n🎉 所有检查通过！系统已准备就绪。")
        print("运行 'python main.py' 启动系统。")
        return 0
    else:
        print(f"\n⚠ 有 {total - passed} 项未通过，请检查后重试。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
