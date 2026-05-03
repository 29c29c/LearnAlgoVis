# LearnAlgoVis

> 一个用于整理、生成、导入、审核和分享算法动画 HTML 的轻量网站。

LearnAlgoVis 是一个 **vibecoding 项目**：它以“快速把想法变成可运行产品”为目标，通过 AI 辅助完成需求拆解、界面设计、代码实现和迭代。项目适合个人、课堂、小团队或兴趣社区用来沉淀算法动画页面。

## 功能特性

- **用户目录**
  - 每个用户都有独立的算法动画导航页。
  - 支持添加、移除、重命名、拖拽排序目录项。
  - 添加别人的公开作品时只保存引用，不重复复制服务器文件。

- **单 HTML 导入**
  - 支持粘贴完整单文件 HTML。
  - 自动保存到服务器 `storage/animations/`。
  - 默认私密，也可申请公开，公开前需要管理员审核。

- **AI 提示词与一键生成**
  - 内置算法动画 HTML 提示词模板。
  - 支持多种页面风格预设。
  - 用户可在左下角设置 AI 厂商、模型和 API Key。
  - 支持 OpenAI-compatible `/chat/completions` 接口。
  - 已内置 DeepSeek V4 Flash、DeepSeek V4 Pro、OpenAI、通义千问、Kimi/Moonshot、OpenRouter、自定义接口等选项。
  - 一键生成会要求 AI 返回 `{ title, description, html }`，并自动导入到个人目录。

- **创意工坊**
  - 浏览管理员审核通过的公开作品。
  - 一键添加到自己的目录。
  - 不重复占用服务器存储。

- **邀请码注册**
  - 普通用户注册必须使用邀请码。
  - 管理员可创建、查看、删除邀请码。
  - 邀请码支持最大使用次数和过期时间。

- **管理员后台**
  - 审核用户申请公开的算法动画。
  - 可人工通过、拒绝或删除作品。
  - 支持 AI 辅助审核待公开作品，但最终公开仍必须人工点击“通过”。
  - 用户作品管理：按用户总占用大小排序，可展开查看作品并删除任意作品。
  - 用户占用超过 10MB 会显示红色警告。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- SQLite
- Drizzle ORM
- better-sqlite3
- bcryptjs

## 目录结构

```text
.
├── src
│   ├── app                 # 页面与 API Routes
│   ├── components          # 前端组件
│   ├── db                  # SQLite/Drizzle schema 和初始化
│   └── lib                 # 认证、安全扫描、AI、导入、审计等服务
├── storage/animations      # 导入后的 HTML 文件，生产环境自动创建
├── package.json
└── README.md
```

`storage/` 不应放入 `public/`，HTML 只能通过受控路由 `/preview/:id` 读取。

## 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

访问：

```text
http://localhost:3000
```

首次注册 `.env` 中 `ADMIN_EMAIL` 对应的邮箱时，可以不填邀请码。系统会把该账号设为管理员。其他用户注册必须使用管理员后台创建的邀请码。

## 环境变量

```bash
DATABASE_URL=./learnalgovis.sqlite
SESSION_SECRET=change-this-to-a-long-random-secret
ADMIN_EMAIL=admin@example.com
STORAGE_DIR=./storage
MAX_HTML_BYTES=2097152
NEXT_PUBLIC_APP_NAME=LearnAlgoVis
```

说明：

- `DATABASE_URL`：SQLite 数据库路径。
- `SESSION_SECRET`：必须使用长随机字符串；同时用于加密用户保存的 AI API Key。
- `ADMIN_EMAIL`：管理员邮箱，首次注册该邮箱会自动成为管理员。
- `STORAGE_DIR`：HTML 文件存储目录。
- `MAX_HTML_BYTES`：单 HTML 最大体积，默认 2MB。

生产环境建议把 SQLite 文件和 `storage/` 放在会被定期备份的持久目录。

## 宝塔面板部署

以下流程适合 2 核 2G 小服务器上的宝塔 Node 项目或 PM2 部署。

### 1. 准备环境

- 安装 Node.js 20 LTS。
- 给站点开启 HTTPS。
- 准备一个不会被清空的持久目录，例如：

```bash
/www/wwwroot/learnalgovis
/www/data/learnalgovis
```

### 2. 上传代码并安装依赖

```bash
cd /www/wwwroot/learnalgovis
npm install
```

### 3. 配置 `.env`

```bash
DATABASE_URL=/www/data/learnalgovis/learnalgovis.sqlite
SESSION_SECRET=请替换为很长的随机字符串
ADMIN_EMAIL=admin@example.com
STORAGE_DIR=/www/data/learnalgovis/storage
MAX_HTML_BYTES=2097152
NEXT_PUBLIC_APP_NAME=LearnAlgoVis
```

创建目录并设置权限：

```bash
mkdir -p /www/data/learnalgovis/storage
```

确保运行 Node 的用户对数据库目录和 `storage/` 有读写权限。

### 4. 构建

```bash
npm run build
```

### 5. 启动

宝塔 Node 项目或 PM2 均可。PM2 示例：

```bash
pm2 start npm --name learnalgovis -- run start
pm2 save
```

默认 Next.js 会监听 `3000`，也可以指定端口：

```bash
npm start -- -p 3001
```

### 6. Nginx 反向代理

把域名反代到 Node 端口，例如：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

生产环境务必开启 HTTPS。HTTPS 下登录 Cookie 会自动使用 `Secure`。

## 安全设计

本项目允许用户上传可执行 JavaScript 的 HTML，因此安全边界非常重要。

当前实现：

- 只支持单文件 HTML，不支持 zip、多文件项目包或外链资源。
- 上传时拒绝明显危险内容：
  - 外链脚本
  - 外链样式
  - iframe
  - form
  - object/embed
  - 自动跳转
  - 网络请求 API
  - Cookie 和本地存储访问
- 预览通过 `/preview/:id` 受控读取文件，不直接暴露上传目录。
- 预览响应设置独立 CSP。
- 前端 iframe 使用：

```html
sandbox="allow-scripts allow-downloads"
```

并且不授予 `allow-same-origin`。

- 公开作品必须管理员审核后才会进入创意工坊。
- 管理员删除作品时会同时删除服务器 HTML 文件并清理数据库引用。
- AI API Key 使用 `SESSION_SECRET` 派生密钥加密后存入 SQLite。

> 注意：这些限制适合第一版公网小规模运行，但不能等同于完整浏览器隔离。若未来开放复杂资源包、更多脚本能力或更大规模公开上传，建议把动画预览迁移到独立子域名，并使用更严格的内容隔离策略。

## 常用命令

```bash
npm run dev      # 本地开发
npm run lint     # 静态检查
npm run build    # 生产构建
npm run start    # 启动生产服务
npm audit        # 依赖安全审计
```

## 数据与备份

需要重点备份：

- SQLite 数据库文件，例如 `learnalgovis.sqlite`
- SQLite WAL/SHM 文件，如果服务运行中需要一致性备份
- `storage/animations/` 下的 HTML 文件
- `.env` 中的关键配置

建议定期备份整个数据目录：

```text
/www/data/learnalgovis
```

## 许可

当前项目未指定开源许可证。公开发布前请根据你的使用目标补充 LICENSE。
