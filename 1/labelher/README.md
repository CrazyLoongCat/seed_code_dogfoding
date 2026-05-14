# LabelHer - 智能图像标注平台

一个类似 LabelMe 的现代化图像标注工具，提供完整的项目管理、多人协作、AI 辅助标注等功能。

## 功能特性

### 核心标注功能
- ✅ Bounding Box（矩形框）标注
- ✅ 多边形标注（支持实例分割）
- ✅ 缩放和平移
- ✅ 标注导出（JSON 格式）
- ✅ 快捷键支持（Delete 删除，Esc 取消）

### 数据与项目管理
- ✅ 多项目管理
- ✅ 数据集管理
- ✅ 批量图片上传
- ✅ 标注类别管理（带颜色标签）
- ✅ 进度统计

### AI 辅助与效率功能
- ✅ AI 目标检测（Mock 实现，可集成真实模型）
- ✅ AI 实例分割接口
- ✅ AI 关键点检测
- ✅ OCR 文字识别接口
- ✅ 批量标注加速

### 多人协作与角色权限
- ✅ 用户认证（JWT Token）
- ✅ 角色系统：管理员、项目经理、审核员、标注员
- ✅ 项目成员管理
- ✅ 任务分配
- ✅ 图片评论功能

## 技术栈

### 后端
- Node.js + Express
- SQLite (better-sqlite3)
- JWT 认证
- Multer 文件上传

### 前端
- React 18
- Vite
- Zustand 状态管理
- React Router
- Tailwind CSS
- Lucide 图标

## 快速开始

### 1. 安装依赖

```bash
# 进入后端目录
cd backend
npm install

# 进入前端目录
cd ../frontend
npm install
```

### 2. 初始化数据库

```bash
cd backend
npm run init-db
```

这将创建数据库并生成默认用户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| manager | manager123 | 项目经理 |
| annotator1 | annotator123 | 标注员 |
| annotator2 | annotator123 | 标注员 |
| reviewer | reviewer123 | 审核员 |

### 3. 启动服务

**后端服务（端口 3001）：**
```bash
cd backend
npm run dev
```

**前端服务（端口 3000）：**
```bash
cd frontend
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 项目结构

```
labelher/
├── backend/
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   │   └── database.js  # 数据库连接
│   │   ├── middleware/      # 中间件
│   │   │   └── auth.js      # 认证中间件
│   │   ├── routes/          # API 路由
│   │   │   ├── auth.js      # 用户认证
│   │   │   ├── projects.js  # 项目管理
│   │   │   ├── datasets.js  # 数据集/图片
│   │   │   ├── annotations.js # 标注功能
│   │   │   ├── ai.js        # AI 辅助
│   │   │   └── collaboration.js # 协作功能
│   │   ├── scripts/
│   │   │   └── init-db.js   # 数据库初始化
│   │   └── server.js        # 入口文件
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # 组件
│   │   │   ├── Layout.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── AnnotationCanvas.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/           # 页面
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProjectList.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   └── AnnotationPage.jsx
│   │   ├── store/           # 状态管理
│   │   │   ├── authStore.js
│   │   │   └── annotationStore.js
│   │   ├── lib/
│   │   │   ├── api.js       # API 封装
│   │   │   └── utils.js     # 工具函数
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `GET /api/auth/me` - 获取当前用户

### 项目
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 数据集
- `GET /api/projects/:id/datasets` - 获取数据集列表
- `POST /api/projects/:id/datasets` - 创建数据集
- `POST /api/datasets/:id/upload` - 上传图片
- `GET /api/datasets/:id/images` - 获取图片列表

### 标注
- `GET /api/projects/:id/classes` - 获取标注类别
- `POST /api/projects/:id/classes` - 创建标注类别
- `GET /api/images/:id/annotations` - 获取图片标注
- `POST /api/images/:id/annotations` - 创建标注
- `DELETE /api/annotations/:id` - 删除标注

### AI 辅助
- `POST /api/ai/detect` - 目标检测
- `POST /api/ai/segment` - 实例分割
- `POST /api/ai/keypoints` - 关键点检测
- `POST /api/ai/ocr` - OCR

### 协作
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks/batch-assign` - 批量分配任务
- `GET /api/images/:id/comments` - 获取评论
- `POST /api/images/:id/comments` - 添加评论

## 使用说明

### 1. 首次使用

1. 使用 admin/admin123 登录
2. 创建一个新项目（选择标注类型）
3. 在项目中添加标注类别
4. 创建数据集并上传图片
5. 点击图片进入标注界面

### 2. 标注操作

- **选择工具**：在左侧工具栏选择"矩形框"
- **选择类别**：在左侧类别列表中选择要标注的类别
- **绘制标注**：在图片上拖动鼠标绘制矩形框
- **删除标注**：选中标注后按 Delete 键
- **平移视图**：按住 Alt 键拖动
- **缩放**：鼠标滚轮

### 3. 团队协作

1. 项目经理创建项目并添加成员
2. 在数据集中批量分配任务给标注员
3. 标注员完成标注后，审核员可以进行审核
4. 团队成员可以在图片上添加评论进行沟通

## 扩展开发

### 集成真实 AI 模型

编辑 `backend/src/routes/ai.js`，将 Mock 实现替换为真实的模型调用：

```javascript
router.post('/detect', authMiddleware, async (req, res) => {
  const { image_url, model } = req.body;
  
  // 集成你的目标检测模型
  // const detections = await yourModel.detect(image_url);
  
  res.json({
    success: true,
    model,
    detections: [...]
  });
});
```

### 支持更多标注类型

目前支持 Bounding Box，可扩展支持：
- 多边形（Polygon）- 实例分割
- 关键点（Keypoints）
- 折线（Polyline）
- 圆形（Circle）

## 许可证

MIT License
