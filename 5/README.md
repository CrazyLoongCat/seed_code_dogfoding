# 网页可访问性与SEO健康度诊断仪 v2.0

一个强大的单页Web应用，用于检测网页的可访问性（A11Y）和SEO健康状况。支持多页面对比、趋势分析和AI智能建议。

## ✨ 新特性 v2.0

### 📊 多页面批量化分析
- 支持一次性输入最多5个URL进行批量分析
- 支持上传包含URL列表的文本文件（.txt）
- 生成对比表格，直观展示各页面健康状况
- 支持导出对比报告（CSV或JSON格式）
- 部分失败容错：个别URL失败不影响其他结果

### 📈 趋势分析（历史快照）
- 自动存储每个URL最近3次的分析记录
- 可视化健康分变化趋势折线图
- 自动对比并高亮显示新增/修复的问题
- 提示进步或退步的检测项

### 🤖 AI功能增强
- **智能建议聚合**：多页面分析时自动识别共性问题
- **修复难度评估**：每条建议标注修复难度（低/中/高）
- **预期分数提升**：预估修复问题后可提升的分数
- **动态模拟模式**：根据域名智能返回不同分数（example.com→80分，test.com→45分）

### 🔧 自动化测试友好
- **CLI模式**：通过命令行参数直接输出JSON结果
- **测试端点**：`/test/diagnose?url=xxx` 返回固定示例数据
- 便于集成到CI/CD流水线

### ⚡ 性能与健壮性升级
- 并发抓取：使用asyncio同时分析多个页面
- 超时与重试：每个页面抓取超时10秒，失败自动重试1次
- 错误隔离：个别规则失败不影响整体分析

## 🔍 检测指标（8项）

| 检测项 | 权重 | 说明 |
|--------|------|------|
| 图片Alt属性 | 15% | 检查图片是否有描述性alt文本 |
| H1标签 | 15% | 确保页面有且仅有一个H1标签 |
| 链接文本 | 10% | 检查链接是否有可识别文本 |
| Lang属性 | 10% | 检查是否设置页面语言 |
| 标题长度 | 10% | 20-60字符为最佳 |
| Meta描述 | 10% | 50-160字符为最佳 |
| 视口设置 | 10% | 检查移动端viewport配置 |
| 标题层级 | 10% | 确保H1→H2→H3顺序正确 |

## 🛠️ 技术栈

- **后端**：Python + FastAPI + httpx（异步HTTP）
- **前端**：HTML + CSS + JavaScript（原生Canvas绘图）
- **网络抓取**：httpx + BeautifulSoup4
- **AI调用**：支持模拟模式和OpenAI API

## 🚀 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 配置环境变量

复制 `.env.example` 为 `.env`：

```
AI_MODE=mock                    # mock / mock_dynamic / real
OPENAI_API_KEY=your_api_key      # AI_MODE=real时需要
CACHE_TTL_SECONDS=600          # 缓存过期时间（秒）
RATE_LIMIT_PER_HOUR=50           # 每小时请求限制
```

### 启动Web服务

```bash
python main.py
```

访问 `http://localhost:8000` 即可使用。

### CLI模式

```bash
# 分析单个URL并输出JSON
python main.py --analyze https://example.com

# 查看帮助
python main.py --help
```

## 📡 API接口

### 单页面分析
```http
POST /api/analyze
Content-Type: application/json

{"url": "https://example.com"}
```

### 批量分析
```http
POST /api/batch-analyze
Content-Type: application/json

{"urls": ["https://example.com", "https://test.com"]}
```

### 文件上传分析
```http
POST /api/upload-analyze
Content-Type: multipart/form-data

file: urls.txt
```

### 历史记录
```http
GET /api/history?url=https://example.com
```

### 趋势分析
```http
GET /api/trend?url=https://example.com
```

### 导出报告
```http
GET /api/export?url=https://example.com&format=json
GET /api/export?url=https://example.com&format=csv
```

### 测试端点
```http
GET /test/diagnose?url=https://example.com
```

## 📁 项目结构

```
.
├── main.py                 # 后端主程序
├── requirements.txt        # Python依赖
├── .env                    # 环境变量配置
├── .env.example           # 环境变量示例
├── static/
│   ├── index.html         # 前端页面
│   ├── styles.css        # 样式文件
│   └── app.js           # 前端逻辑
└── README.md
```

## 🎯 评分规则

- **通过（pass）**：获得该指标100%分值
- **警告（warning）**：获得该指标50%分值
- **失败（fail）**：获得该指标0分

健康分等级：
- 90-100：优秀
- 70-89：良好
- 50-69：一般
- 0-49：较差

## 💡 使用场景

1. **网站上线前检查**：确保新页面符合可访问性和SEO标准
2. **多站点对比**：对比分析多个竞争网站的健康状况
3. **持续监控**：定期检测同一URL，跟踪健康分变化趋势
4. **团队协作**：导出报告分享给开发团队进行优化
5. **CI/CD集成**：在部署流程中自动检测页面健康度
