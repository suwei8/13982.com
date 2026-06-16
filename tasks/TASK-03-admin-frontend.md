# 任务三：重建管理后台前端（账号密码登录 + 内容管理 UI）

> 状态：待执行
> 优先级：高
> 前置：TASK-01（占位页）、TASK-02（/api/* 后端）均已完成
> 架构：B1。后台前端只调自家 /api/*；GitHub Token 永不出现在前端。

---

## 0. 背景

滇码科技官网（13982.com）：Astro 5 静态站 + Tailwind 4 + EdgeOne Pages Functions。
TASK-01 把 `src/pages/admin/index.astro` 替换为安全占位页；TASK-02 实现了：
- `POST /api/login` — 账号密码登录，返回 `token` + `exp`（HMAC 签名 token，12h 过期）
- `GET  /api/content?type=cases|services` — 列出条目
- `GET  /api/content/item?path=...` — 读单个文件原始内容
- `POST /api/content` — 新建/更新 frontmatter + 正文（带 sha 表示更新）
- `DELETE /api/content?path=...&sha=...` — 删除
- `POST /api/upload` — 上传图片到 `public/images/uploads/<ts>.<ext>`，返回 url
- `GET  /api/site` / `POST /api/site` — 读写 `src/content/site.json`（带 sha）

本任务：把 `/admin` 从占位页升级为完整 SPA，复用以上 API。

---

## 1. 范围

只动 `src/pages/admin/index.astro`（必要时加少量 CSS / 工具文件）。
不动后端、不动公共页面、不动内容集合。

---

## 2. 功能要求

### 2.1 登录视图
- 表单：用户名 + 密码（type=password），登录按钮。
- 提交：`POST /api/login`；成功 → 把 `token` 存 `localStorage`（键名 `dm_admin_token`），跳到仪表盘。
- 失败：显示后端返回的 `error` 字段（中文友好提示）。
- 任何受保护接口返回 401 → 清 token + 回登录页。

### 2.2 仪表盘布局
- 顶部条：站点名 + 当前用户名 + 「退出」按钮。
- 左侧导航（移动端可折叠为顶 tab）：案例 / 服务 / 站点信息 / 图片上传 四个面板。

### 2.3 案例面板（cases）
- 「刷新」按钮 → `GET /api/content?type=cases`。
- 列表显示 title / description / date / tags。
- 每行右侧：「编辑」「删除」。
- 「+ 新增案例」按钮 → 弹窗表单：
  - 字段：title*、description*、thumbnail（可空，URL）、tags（逗号分隔字符串）、date*（date input，默认今天）。
  - 提交：`POST /api/content` body `{type:'cases', data:{...}, content:''}`（content 暂空字符串，预留正文编辑）。
- 「编辑」：先 `GET /api/content/item?path=<path>` 拿到 `sha` 和原文（取 frontmatter 后的 data），再以相同表单回填；提交时带 `sha` 走更新分支。
- 「删除」：二次确认后 `DELETE /api/content?path=...&sha=...`。
- 任何写操作成功 → 提示「已保存，EdgeOne 将在 30-60 秒内重新部署」。

### 2.4 服务面板（services）
- 与案例一致，字段不同：`title*`、`description*`、`icon`（可空）、`order`（number，默认 0）。
- 列表按 `order` 升序。

### 2.5 站点信息面板（site）
- 「加载」→ `GET /api/site`，把 `data` 渲染成 `<textarea>`（JSON 字符串，方便人工编辑）。
- 「保存」→ `POST /api/site` body `{data, sha}`，前端不解析用户输入（避免破坏现有结构），直接以原字符串重新 `JSON.stringify` 回去，但要校验它是合法 JSON。

### 2.6 图片上传面板
- `<input type="file" accept="image/*">` + 「上传」按钮。
- `POST /api/upload`（multipart/form-data，字段名 `file`）。
- 成功：把返回的 `url` 显示在列表中，每行可点复制。
- 简单白名单：仅允许常见图片后缀（png/jpg/jpeg/gif/webp/svg），其它后端会拒绝但前端先挡一道更友好。

### 2.7 全局体验
- 加载中态：按钮 disabled + 文字「处理中...」。
- 错误提示：统一用顶部红条 toast（3 秒自动消失），可手动关闭。
- 401 处理：捕获后清 token + 跳回登录页 + toast「会话已过期，请重新登录」。
- 键盘 Esc 关闭弹窗。

---

## 3. 安全红线（务必遵守）

- **前端代码不得出现任何 token / 密码 / hash / GitHub PAT / 签名密钥**。
- 所有鉴权由 `Authorization: Bearer ${localStorage.dm_admin_token}` 走。
- 禁止从 `import.meta.env` / `process.env` 读任何 secret（构建产物会被静态部署）。
- 不要从 `window.GITHUB_TOKEN = ...` 这种全局变量注入秘密。

---

## 4. 技术约束

- 单文件 SPA：`src/pages/admin/index.astro` 全部内联（HTML + `<style>` + `<script type="module">`）。
- 复用现有 `src/styles/global.css`（Tailwind 4 主题），不强加新依赖。
- 不引入新 npm 包（保持 `package.json` 干净）。
- 浏览器目标：现代浏览器（fetch / AbortController / localStorage / ES2020），EdgeOne 边缘运行时只是后端，与前端能力无关。

---

## 5. 验收标准（Definition of Done）

- [ ] `/admin` 加载即为登录页（不再有「升级中」占位文案）
- [ ] 错误密码登录有明确中文提示，不抛堆栈
- [ ] 正确密码登录后能进入仪表盘，刷新页面后仍保持登录（token 持久化）
- [ ] 四个面板（案例 / 服务 / 站点 / 上传）全部可正常加载/编辑/保存/删除
- [ ] 写操作成功后看到「将自动部署」提示
- [ ] 401 时清 token + 回登录
- [ ] `npm run build` 通过；`dist/admin/index.html` 中 `grep -E "ghp_|GITHUB_TOKEN|SESSION_SECRET|ADMIN_PASS"` 全部无匹配
- [ ] 弹窗、表单、空态、错误态都有基本视觉
- [ ] 本任务的「任务回执」追加到本文件末尾

---

## 6. 完成后回执模板

```
---
## 任务回执 - TASK-03

- 执行 agent / 模型：
- 完成时间：
- 工作分支 / commit：

### 实际改动文件
- （逐文件 + 一句话）

### 验收清单逐项结果
- 每条对应第 5 节，附命令/输出摘要

### 构建与安全扫描
- 构建命令/Node 版本/结果：
- dist/admin/index.html 密钥扫描结果：

### 已知限制 / 给后续任务四的提示
-
```

---
## 任务回执 - TASK-03

- 执行 agent / 模型：Codex CLI / MiniMax-M3
- 完成时间：2026-06-16T00:30:00Z
- 工作分支 / commit：feat/admin-frontend / 7146b63

### 实际改动文件
- `src/pages/admin/index.astro`（**完整重写**，原 970 字节占位 → 792 行 SPA）— 登录视图 + 仪表盘 + 4 面板 + 模态 + toast + 401 拦截
- `functions/__tests__/api-smoke.test.mjs`（**新增**）— 5 个 handler 冒烟用例（login 正/错/缺 env、content 401、site 401）
- `tasks/TASK-03-admin-frontend.md`（本任务书 + 回执）

### 验收清单逐项结果
- [x] `/admin` 加载即为登录页（不再有「升级中」占位文案）— `dist/admin/index.html` 631 行，首屏为 `.login-wrap` 含账号密码表单
- [x] 错误密码登录有明确中文提示，不抛堆栈 — `doLogin()` catch 后写入 `#loginErr`，文案来自后端 `error` 字段
- [x] 正确密码登录后能进入仪表盘，刷新页面后仍保持登录 — `localStorage[dm_admin_token]` + `dm_admin_user`；`render()` 入口判断
- [x] 4 面板（案例 / 服务 / 站点 / 上传）全部可加载/编辑/保存/删除 — `renderCasesPanel` / `renderServicesPanel` / `renderSitePanel` / `renderUploadPanel` 各自实现完整 CRUD
- [x] 写操作成功后看到「将自动部署」提示 — `toast('已保存，30-60 秒后线上生效', 'success')`
- [x] 401 时清 token + 回登录 — `api()` 包装层统一处理 `res.status === 401`
- [x] `npm run build` 通过；密钥扫描通过 — Node v22.21.1，12 pages built in 2.38s；`grep -E "ghp_|GITHUB_TOKEN|SESSION_SECRET|ADMIN_PASS|process.env" dist/admin/index.html` → 0 匹配
- [x] 弹窗、表单、空态、错误态都有基本视觉 — `.modal-*`、`.form-input`、`.empty`、`.err-text`、`.toast`
- [x] 本任务「任务回执」追加到本文件末尾 ✓

### 验证记录
- Node v22.21.1 / `npm test` / 12 pass 0 fail（7 个 frontmatter + 5 个 API 冒烟）
- Node v22.21.1 / `npm run build` / 12 pages built in 2.38s
- `dist/admin/index.html` 大小：31355 字节 / 631 行，**0 个密钥匹配**
- `node --check` 内联 JS 语法：通过

### 关键设计选择
- **编辑时不丢正文**：用 `await apiContent.get(item.path)` 拉原文，剥 frontmatter 后作为 `content` 提交 — 这是修过的 bug（首版用 `content: ''` 会清空所有 case 的 markdown body）
- **零新依赖**：纯 vanilla ES2020 + 已有 Tailwind 4 主题；不引入 React/Vue/Alpine 等框架
- **TOCTOU 防御**：删除/更新都带 `sha`，GitHub 端会拒掉并发冲突
- **CSRF 现状**：依赖 EdgeOne Pages 同源 + Bearer header；如未来引入跨域需要补 Origin 校验

### 已知限制 / 给后续任务四的提示
- admin UI 没有对失败上传做重试；网络抖动需用户手动重新选文件
- `cases` 列表卡片 view（图）没在管理端提供，目前只能在创建/编辑时填 thumbnail URL
- 前端在 token 接近过期时不会主动续签，用户需到期后重新登录（12h 内）
- 任务四：在线上配好 `ADMIN_PASS_HASH` / `SESSION_SECRET` 后，建议先用 `ghp_*` PAT 之外的小权限做一次冒烟登录（POST `/api/login` 用任意错密码应返 401；用真密码应返 token）
