# 算法动画整理网站实施方案

**Summary**
- 从当前空项目新建一个 `Next.js + TypeScript` 单体应用，适配宝塔 Node/PM2 部署。
- 使用 `SQLite + Drizzle ORM + better-sqlite3`，数据和上传 HTML 文件都放在服务器持久目录中。
- 第一版支持：邀请码注册登录、个人目录、单 HTML 导入、提示词生成器、创意工坊、管理员邀请码/审核/删除后台。
- 上传 HTML 采用同域 `iframe sandbox` 隔离，并配合严格 CSP、大小限制、静态扫描和管理员审核。

**Key Changes**
- 应用结构：
  - 前台：个人目录页、创意工坊页、导入/提示词页、登录注册页。
  - 后台：管理员邀请码管理、公开作品审核、作品删除。
  - 动画预览：只通过受控 route 读取服务器文件，不直接暴露上传目录。
- 数据模型：
  - `users`：账号、密码哈希、角色、创建时间、是否禁用。
  - `invite_codes`：邀请码、最大使用次数、已使用次数、过期时间、创建者。
  - `animations`：标题、描述、作者、文件路径、哈希、公开状态、审核状态、风格、创建时间。
  - `directory_items`：用户目录引用、排序值、自定义标题、来源动画 ID。
  - `audit_logs`：管理员审核、删除、邀请码创建等关键操作记录。
- 权限规则：
  - 环境变量指定管理员账号，例如 `ADMIN_EMAIL`，首次登录/初始化时赋予管理员角色。
  - 注册必须使用有效邀请码；邀请码采用“限次数”策略。
  - 用户只能管理自己的目录和自己的动画。
  - 公开视频需管理员审核通过后才出现在创意工坊。
  - 用户添加他人作品到目录时只创建引用，不复制服务器文件。
  - 管理员删除创意工坊作品时，同时删除数据库记录、用户目录引用和服务器 HTML 文件。
- HTML 导入与安全：
  - 第一版只支持粘贴或上传“单文件 HTML”，建议限制 2MB。
  - 上传时计算 SHA-256，保存到 `storage/animations/{animationId}.html`。
  - 拒绝明显危险内容：外链脚本、外链样式、表单提交、iframe、object/embed、自动跳转、可疑协议。
  - 预览用 `<iframe sandbox="allow-scripts allow-downloads">`，不加 `allow-same-origin`。
  - HTML 响应头单独设置 CSP：`sandbox allow-scripts allow-downloads`、禁止网络请求、禁止表单、限制图片/媒体为 `data:` 或 `blob:`。
  - 主站 Cookie 使用 `HttpOnly`、`SameSite=Lax`、生产环境 `Secure`。
- 提示词生成器：
  - 预设风格建议：清爽教学、深色科技、极简白板、像素游戏、玻璃拟态仪表盘。
  - 输入“一句话算法主题”后生成完整单 HTML 提示词。
  - 模板强制要求：HTML/CSS/JS 全内联、无外链依赖、响应式、可交互动画、步骤控制、重置、说明区、导出按钮。
  - 导出按钮默认导出当前动画页面的完整 HTML 文件，便于再导入或分享。
- UI 默认方向：
  - 不是营销首页，首屏直接进入应用式体验。
  - 桌面端采用左侧导航 + 主内容区；移动端底部/抽屉导航。
  - 个人目录支持拖拽排序、删除引用、编辑标题、公开/私有状态切换。
  - 创意工坊支持搜索、作者、算法类别、最新/热门排序、预览、添加到我的目录。
  - 管理员后台采用紧凑表格和审核操作，不做装饰性大卡片堆叠。

**Implementation Steps**
- 初始化 Next.js 应用，配置 TypeScript、Tailwind、ESLint、Drizzle、SQLite、基础目录结构。
- 实现认证：
  - 密码使用 Argon2 或 bcrypt 哈希。
  - 使用服务器端 session 表 + opaque token Cookie。
  - 中间件保护登录页、用户页、管理员页。
- 实现数据库 schema 和初始化脚本：
  - 自动创建 SQLite 数据库。
  - 根据 `ADMIN_EMAIL` 初始化/提升管理员。
- 实现核心页面和 API：
  - 注册登录、邀请码验证。
  - 个人目录 CRUD 和排序。
  - HTML 导入、保存、扫描、预览。
  - 公开申请和审核流。
  - 创意工坊浏览与添加引用。
  - 管理员邀请码创建、审核、删除。
- 实现 HTML 安全服务层：
  - 文件保存路径不可由用户控制。
  - 所有读取必须按动画 ID 查库。
  - 删除文件时记录审计日志。
  - 预览 route 设置专用 CSP、`X-Content-Type-Options: nosniff`、禁止缓存或短缓存。
- 实现提示词生成器：
  - 风格 preset 映射到固定规范片段。
  - 用户主题拼入结构化模板。
  - 输出可复制提示词，并提供“生成单 HTML 的约束清单”。
- 部署准备：
  - `.env.example` 包含 `DATABASE_URL`、`SESSION_SECRET`、`ADMIN_EMAIL`、`STORAGE_DIR`、`MAX_HTML_BYTES`。
  - 提供宝塔部署说明：安装 Node、构建、PM2 启动、Nginx 反代、HTTPS、持久化目录权限。
  - SQLite 文件和 `storage/` 放到可备份目录，不放进 `public/`。

**Test Plan**
- 认证：
  - 无邀请码不能注册。
  - 邀请码超过次数后失效。
  - 普通用户不能访问管理员页面/API。
  - `ADMIN_EMAIL` 对应账号拥有管理员权限。
- 目录：
  - 添加自己的动画、添加他人公开视频引用、删除目录项不删除原文件。
  - 拖拽排序后刷新顺序保持。
- 公开审核：
  - 用户设为公开后进入待审核。
  - 未审核作品不出现在创意工坊。
  - 管理员批准后可被其他用户添加。
  - 管理员删除后文件从磁盘移除，相关目录引用失效或被清理。
- HTML 安全：
  - 外链脚本、iframe、form、跳转类 HTML 被拒绝。
  - 合规单 HTML 可在 sandbox iframe 中运行动画。
  - 动画无法读取主站 Cookie，无法发起网络请求。
  - 模板生成的导出按钮可下载 HTML。
- 生产检查：
  - 构建通过。
  - SQLite 数据库可读写。
  - 上传目录权限正确。
  - HTTPS 下 Cookie 带 `Secure`。
  - 关键 API 有鉴权、大小限制、错误处理和审计日志。

**Assumptions**
- 技术栈采用 Node/Next.js，而不是 PHP 或 Python。
- 第一版只支持单文件 HTML，不支持 zip、多资源项目包或外链收藏。
- HTML 预览采用同域 `iframe sandbox`，不配置独立子域名。
- 公开内容必须先经过管理员审核。
- 邀请码采用限次数策略，可选过期时间。
- SQLite 足够支撑当前 2 核 2G 服务器规模，后续用户量明显增长时再迁移 PostgreSQL。
