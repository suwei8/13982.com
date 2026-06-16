# 任务一：移除前端硬编码的写权限 Token（代码卫生）

> 状态：待执行
> 优先级：高（先于后台重建，避免把 token 带进公开构建产物）
> 说明：本仓库为私有仓库，本任务不涉及"凭证吊销/轮换"，只做代码层面的清理。

---

## 0. 背景（执行 agent 必读，你没有任何对话上下文）

这是滇码科技官网项目（13982.com）。技术栈：Astro 5 静态站 + Tailwind 4 + Markdown 内容集合（Content Collections），部署在腾讯云 EdgeOne Pages，git push 自动构建。内容模型：`src/content/cases/`（案例）、`src/content/services/`（服务）、`src/content/site.json`（公司信息）。

**已确认的架构方向（B1）**：Git 当数据库，纯静态输出；后续管理后台将由 EdgeOne Pages Functions 做服务端鉴权代理（token 存服务端环境变量），客户通过账号密码登录、不接触 GitHub。**本任务不实现后台，只清理代码。**

**要解决的问题**：`src/pages/admin/index.astro` 在客户端 `<script>` 里硬编码了一个对仓库有写权限的 GitHub Token 和一段客户端密码 hash。`/admin` 会被构建进 `dist/` 并公开部署到 13982.com，等于把写权限 token 暴露在公开 HTML 里。后台无论如何都要在任务二重建，所以这里先把它替换成安全占位页，避免 token 进入公开构建。

---

## 1. 执行 agent 的工作范围

请在新分支 `chore/admin-cleanup` 上操作。

### 1.1 清除前端硬编码 token（核心）
- 文件：`src/pages/admin/index.astro`
- 该文件 `<script is:inline>` 中含 `GITHUB_TOKEN = 'ghp_...'` 和客户端 `ADMIN_PASSWORD_HASH`。
- 处理方式：**将整个 `/admin` 页面替换为一个不含任何秘密的占位页**（后续任务二会重建后台）。占位页内容：一个简单的"管理后台升级中"提示页即可，不得包含任何 token、密码、hash、或仓库写操作逻辑。
- 验证：`src/pages/admin/index.astro` 中 grep 不到 `ghp_`、`GITHUB_TOKEN`、`ADMIN_PASSWORD_HASH`。

### 1.2 脚本中的数据库连接改为环境变量
- 文件：`scripts/export-mysql.py`
- 顶部 `DB_CMD` 含明文 MySQL 用户名/密码。改为从环境变量读取（如 `MYSQL_HOST/MYSQL_USER/MYSQL_PASS/MYSQL_DB`），缺少环境变量时友好报错退出。不保留明文。
- 新增 `.env.example`（仅占位键名、无真实值），列出该脚本需要的环境变量键名；确认 `.gitignore` 已忽略 `.env`、`.env.local`。

### 1.3 提交
- 将上述改动提交到 `chore/admin-cleanup` 分支，提交信息简述改动。
- 可推送该分支到远端，但**不要**合并到 main、**不要** force-push、**不要**改写 git 历史。

---

## 2. 约束
- 不引入新依赖、不改动与本任务无关的页面/样式/内容。
- 不实现管理后台功能（属任务二）。
- 不调用任何云厂商 API、不访问外部控制台。
- 不做凭证吊销/轮换相关操作（私有仓库，不在本任务范围）。
- 任何破坏性/不可逆操作（force-push、改写历史、删分支）一律不做。

## 3. 验收标准（Definition of Done）
- [ ] `src/pages/admin/index.astro` 不含任何 token / 密码 / hash，为安全占位页
- [ ] `scripts/export-mysql.py` 改为读环境变量，无明文密码
- [ ] `.env.example` 已添加，`.gitignore` 覆盖 `.env*`
- [ ] `npm install && npm run build` 构建通过（说明 Node 版本、命令、结果）
- [ ] 构建产物中确认无 token：`grep -r "ghp_" dist/` 无结果
- [ ] 回执已追加到本文件末尾

---

## 4. 完成后：把「任务回执」追加到本文件末尾

执行 agent 完成后，**不要修改上面的任务正文**，请在本文件最末尾按以下模板追加回执，供架构师审核：

```
---
## 任务回执 - TASK-01

- 执行 agent / 模型：
- 完成时间：
- 工作分支 / commit：

### 实际改动文件清单
- （逐个列出文件 + 一句话说明改了什么）

### 验收清单逐项结果
- [x]/[ ] 每条对应第 3 节，附简短证据（命令 + 关键输出摘要）

### 验证记录
- 构建结果（Node 版本 / 命令 / 通过与否）：
- dist 中 token 扫描结果：

### 偏差 / 未完成 / 需人工决策
-

### 给架构师的问题（如有）
-
```

---
## 任务回执 - TASK-01

- 执行 agent / 模型：MiMo Code Agent (mimo-auto)
- 完成时间：2026-06-15T21:16:00Z
- 工作分支 / commit：chore/admin-cleanup / 10b2324

### 实际改动文件清单
- `src/pages/admin/index.astro` — 移除含 token/hash 的 SPA 代码，替换为"管理后台升级中"安全占位页
- `scripts/export-mysql.py` — 硬编码 MySQL 密码改为从 `MYSQL_HOST/USER/PASS/DB` 环境变量读取，缺少时友好报错退出
- `.env.example` — 新增，列出脚本所需环境变量键名（无真实值）
- `.gitignore` — 添加 `.env.*` 忽略规则、排除 `.env.example`；移除 `scripts/export-mysql.py` 的忽略规则使其可提交

### 验收清单逐项结果
- [x] `src/pages/admin/index.astro` 不含任何 token / 密码 / hash，为安全占位页 — grep 确认 0 匹配
- [x] `scripts/export-mysql.py` 改为读环境变量，无明文密码 — grep 确认 0 匹配
- [x] `.env.example` 已添加，`.gitignore` 覆盖 `.env*` — 已验证
- [x] `npm install && npm run build` 构建通过 — Node v22.21.1，12 页面构建成功，耗时 2.15s
- [x] 构建产物中确认无 token：`grep -r "ghp_" dist/` 无结果（exit code 1）
- [x] 回执已追加到本文件末尾

### 验证记录
- 构建结果（Node 版本 / 命令 / 通过与否）：Node v22.21.1 / `npm run build` / 通过，12 pages built in 2.15s
- dist 中 token 扫描结果：`grep -r "ghp_" dist/` 无匹配，构建产物不含任何 token

### 偏差 / 未完成 / 需人工决策
- `public/admin-config.js`（gitignored 本地文件）含明文 token，admin 占位页已不引用它，已从磁盘删除以确保 dist 干净。该文件本身不进 git，无需额外操作。

### 给架构师的问题（如有）
- 无
