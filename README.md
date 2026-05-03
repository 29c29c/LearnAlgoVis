# LearnAlgoVis

一个用于整理、导入、审核和分享算法动画 HTML 的 Next.js 单体应用。

## 本地启动

```bash
npm install
cp .env.example .env
npm run dev
```

首次注册 `ADMIN_EMAIL` 配置的邮箱时可以不填邀请码，系统会把该账号设为管理员。其他用户注册必须使用管理员后台创建的邀请码。

## 环境变量

```bash
DATABASE_URL=./learnalgovis.sqlite
SESSION_SECRET=change-this-to-a-long-random-secret
ADMIN_EMAIL=admin@example.com
STORAGE_DIR=./storage
MAX_HTML_BYTES=2097152
NEXT_PUBLIC_APP_NAME=LearnAlgoVis
```

`DATABASE_URL` 和 `STORAGE_DIR` 应放在会被备份的持久目录中，不要放进 `public/`。

## 宝塔面板部署建议

1. 安装 Node.js 20 LTS。
2. 上传项目并在项目目录执行：

```bash
npm install
npm run build
```

3. 在宝塔 Node 项目或 PM2 中启动：

```bash
npm run start
```

4. Nginx 反代到 Next.js 端口，并开启 HTTPS。
5. 生产环境务必设置长随机 `SESSION_SECRET`，并确保 `storage/` 与 SQLite 文件目录仅应用进程可写。

## 安全边界

- 只支持单文件 HTML 导入。
- 上传内容会拒绝外链脚本、外链样式、iframe、form、object/embed、自动跳转、网络请求 API、Cookie 和本地存储访问。
- 预览通过 `/preview/:id` 受控读取文件，并设置独立 CSP。
- 页面 iframe 使用 `sandbox="allow-scripts allow-downloads"`，不授予 `allow-same-origin`。
- 公开内容必须管理员审核后才会出现在创意工坊。
- 用户可在左下角“设置”里保存 AI 厂商和 API Key；Key 使用 `SESSION_SECRET` 派生密钥加密后存入 SQLite。
- “一键生成 HTML 并添加到目录”会调用 OpenAI-compatible `/chat/completions`，要求 AI 返回 `{ title, description, html }` JSON，并在导入前复用同一套 HTML 安全扫描。

这些限制适合第一版公网运行，但不能等同于完整浏览器沙箱。后续如开放更复杂 HTML/资源包，建议迁移到独立预览子域名。
