# 新闻热点趋势对比器

一个实时对比两个新闻网站热点话题的Web应用，支持AI智能分析差异。

## ✨ 功能特性

- **多源抓取**: 支持新浪微博、百度热搜、知乎热搜等主流平台，以及RSS源
- **智能合并**: 自动合并相同或相似的新闻标题，标记多来源
- **热度归一化**: 自动解析不同网站的热度值（如"123万"、"热度45.2"）并统一排序
- **AI分析**: 
  - 模拟模式：基于关键词规则分析，无需API密钥
  - 真实模式：支持OpenAI API智能分析
  - 自动降级：AI调用失败时自动切换到规则分析
- **主题提取**: 自动识别共同主题和各网站热门话题
- **响应式界面**: 支持表格排序、加载动画、错误提示
- **缓存机制**: 1分钟内重复请求自动返回缓存结果

## 🛠️ 技术栈

- **后端**: Python + FastAPI + aiohttp
- **前端**: HTML5 + CSS3 + 原生JavaScript
- **解析**: BeautifulSoup4 + feedparser
- **AI**: OpenAI API (可选)

## 📦 安装运行

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python run.py
```

或直接使用uvicorn:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 访问应用

打开浏览器访问: `http://localhost:8000`

## 📡 内置解析器

| 网站 | URL示例 |
|------|--------|
| 新浪微博热搜 | `https://s.weibo.com/top/summary` |
| 百度热搜 | `https://top.baidu.com/board` |
| 知乎热搜 | `https://www.zhihu.com/hot` |
| RSS源 | 任意`.xml`/`.rss`/`.atom`结尾的链接 |

## 🔌 API接口

### POST /api/compare
对比两个新闻来源

**请求体**:
```json
{
  "url1": "https://s.weibo.com/top/summary",
  "url2": "https://top.baidu.com/board",
  "source1_name": "新浪微博",
  "source2_name": "百度热搜",
  "use_simulate_ai": true,
  "ai_api_key": "sk-..."
}
```

**响应**:
```json
{
  "merged_news": [
    {
      "title": "新闻标题",
      "hot_value": 1234567,
      "original_hot": "123.5万",
      "source": "新浪微博, 百度热搜",
      "rank": 1
    }
  ],
  "ai_analysis": {
    "common_themes": ["科技", "娱乐"],
    "comparison": "微博更关注娱乐，百度更关注科技",
    "source1_topics": ["娱乐", "社会"],
    "source2_topics": ["科技", "财经"],
    "analysis_mode": "simulated_ai"
  },
  "source1_count": 40,
  "source2_count": 35,
  "error_messages": [],
  "cached": false
}
```

### GET /api/parsers
获取可用解析器列表

### POST /api/register-parser
注册自定义解析器

**请求体**:
```json
{
  "name": "我的自定义站点",
  "url_pattern": "example\\.com",
  "item_selector": ".news-item",
  "title_selector": ".title",
  "hot_selector": ".hot-value",
  "is_rss": false
}
```

### GET /api/cache/clear
清空缓存

## 🎯 项目结构

```
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI主应用
│   ├── models.py         # 数据模型
│   ├── parser.py         # 抓取和解析模块
│   ├── ai_analyzer.py    # AI分析模块
│   └── utils.py          # 工具函数
├── static/
│   ├── index.html        # 前端页面
│   ├── styles.css        # 样式
│   └── app.js            # 前端逻辑
├── run.py                # 启动脚本
├── requirements.txt      # 依赖列表
└── README.md
```

## 📝 使用说明

1. 在输入框中填入两个新闻网站的URL
2. （可选）修改来源名称
3. 选择是否使用模拟AI（默认开启，无需配置）
4. 点击"开始对比分析"
5. 查看合并后的热点榜单和AI分析结果

## ⚠️ 注意事项

- 由于网站结构可能变化，内置解析器可能需要更新CSS选择器
- 真实AI模式需要有效的OpenAI API Key
- 抓取频率过高可能被目标网站限制访问
- 本项目仅用于学习研究用途
