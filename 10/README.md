# BurpSuite 抓包辅助工具

一个用于整理、存储和分析 BurpSuite 抓包数据的 Web 应用。

## 功能特性

- 📥 **多格式支持**: 支持导入 BurpSuite 导出的 XML、JSON 格式文件，以及原始 HTTP 文本
- 💾 **本地持久化**: 使用 SQLite 数据库存储所有抓包记录
- 🔍 **智能检索**: 支持按 URL、HTTP 方法、状态码、敏感信息等多维度筛选
- ⚠️ **敏感信息检测**: 自动识别包含密码、Token、密钥等敏感信息的请求
- 🏷️ **自动标签**: 根据请求特征自动打标签，便于分类管理
- 📊 **统计面板**: 实时展示抓包数量、方法分布、状态码分布等统计信息
- ⚙️ **配置化**: 可配置敏感关键词、每页显示条数等参数
- 🎨 **深色主题**: 护眼的深色界面设计

## 技术栈

### 后端
- Python 3.8+
- Flask - Web 框架
- Flask-SQLAlchemy - ORM
- SQLite - 数据库
- lxml - XML 解析

### 前端
- Vue 3 + Vite
- Element Plus - UI 组件库
- Vue Router - 路由
- Axios - HTTP 客户端

## 快速开始

### 方式一：使用启动脚本（推荐）

Windows 用户直接运行：
```bash
run.bat
```

### 方式二：手动启动

#### 1. 安装后端依赖

```bash
cd backend
pip install -r ../requirements.txt
```

#### 2. 安装前端依赖并构建

```bash
cd frontend
npm install
npm run build
```

#### 3. 启动后端服务

```bash
cd backend
python app.py
```

#### 4. 访问应用

打开浏览器访问：http://localhost:5000

### 开发模式

如果需要同时开发前端和后端：

1. 启动后端服务（端口 5000）
```bash
cd backend
python app.py
```

2. 启动前端开发服务器（端口 5173）
```bash
cd frontend
npm run dev
```

3. 访问 http://localhost:5173

## 使用说明

### 1. 从 BurpSuite 导出数据

1. 在 BurpSuite 的 **Proxy** -> **HTTP history** 中选中要导出的请求
2. 右键点击选中的请求，选择 **"Save items"**
3. 在弹出的对话框中选择导出格式（**推荐 XML**）
4. 保存文件

### 2. 导入数据

1. 进入「数据导入」页面
2. 拖拽或选择刚才保存的文件
3. 点击「开始导入」
4. 导入完成后会自动跳转到抓包记录列表

也可以直接粘贴 BurpSuite 的原始数据内容进行导入。

### 3. 查看和筛选

- 在「抓包记录」页面可以查看所有导入的请求
- 使用顶部筛选栏按条件过滤
- 点击表格中的「查看」按钮查看完整的请求和响应详情
- 可以为请求添加自定义标签

### 4. 系统配置

进入「系统配置」页面可以：
- 开启/关闭自动解析
- 配置敏感信息检测关键词
- 设置每页显示条数
- 切换主题

## 项目结构

```
.
├── backend/                 # 后端代码
│   ├── app.py              # Flask 应用入口
│   ├── models.py           # 数据库模型
│   ├── parser.py           # BurpSuite 数据解析器
│   ├── routes.py           # API 路由
│   └── burp_helper.db      # SQLite 数据库（自动生成）
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── api/            # API 接口
│   │   ├── router/         # 路由配置
│   │   ├── styles/         # 全局样式
│   │   ├── views/          # 页面组件
│   │   ├── App.vue         # 根组件
│   │   └── main.js         # 入口文件
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── dist/               # 构建产物（自动生成）
├── requirements.txt        # Python 依赖
├── run.bat                 # Windows 启动脚本
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/packets | 获取抓包记录列表 |
| GET | /api/packets/:id | 获取抓包详情 |
| DELETE | /api/packets/:id | 删除单条记录 |
| DELETE | /api/packets | 批量删除或清空记录 |
| PUT | /api/packets/:id/tags | 更新记录标签 |
| POST | /api/import | 导入 BurpSuite 数据 |
| GET | /api/config | 获取所有配置 |
| PUT | /api/config | 更新配置 |
| GET | /api/stats | 获取统计数据 |

## 支持的导入格式

### XML 格式
BurpSuite 原生导出格式，包含最完整的请求和响应信息，**推荐使用**。

### JSON 格式
结构化的 JSON 数据，便于程序处理和二次开发。

### 原始文本
直接复制的 HTTP 请求/响应原始内容，支持多个请求用空行分隔。

## 许可证

MIT License
