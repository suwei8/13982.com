# 滇码科技官网（13982.com）项目说明与迁移指南

本项目是一个基于 **Astro 静态站点 + EdgeOne Makers + Edge Functions + Gitee 内容仓库 + EdgeOne Blob 媒体库** 的企业官网与轻量 CMS 方案。它适合软件开发公司、企业官网、案例展示型网站，以及需要低成本、免服务器、可后台维护内容的静态网站重构迁移。

文档状态：本文档用于团队交接、后续 agent 理解项目、以及把当前架构迁移到其他 EdgeOne Makers 官网项目。

当前项目已经验证通过的核心能力：

- 前台静态页面由 Astro 构建，部署到 EdgeOne Makers。
- 后台管理页面支持登录、内容管理、站点配置、图片上传与媒体管理。
- 内容文件存放在 Gitee 仓库中，通过 Edge Functions 调用 Gitee API 读写。
- 图片上传默认推荐使用 EdgeOne Blob Storage，上传后无需重新构建即可访问。
- 管理后台路径可通过环境变量移动到非 `/admin` 路径。
- 构建流程会自动把 Edge Functions 复制到 `dist/edge-functions/`，确保 EdgeOne Makers 能识别函数。

---

## 1. 技术架构总览

### 1.1 架构图

```text
浏览器用户
  │
  ├─ 访问官网页面
  │    ↓
  │  EdgeOne CDN / Makers 静态资源
  │    ↓
  │  Astro 构建产物 dist/
  │
  ├─ 访问后台管理路径，例如 /sw/
  │    ↓
  │  静态后台页面 + Edge Functions API
  │
  ├─ 登录 /api/login
  │    ↓
  │  Edge Function 校验 ADMIN_USER / ADMIN_PASS_HASH / SESSION_SECRET
  │
  ├─ 管理案例、服务、站点配置
  │    ↓
  │  Edge Functions 调用 Gitee API
  │    ↓
  │  src/content/cases、src/content/services、src/content/site.json
  │
  └─ 上传/管理图片
       ↓
     Edge Functions
       ↓
     EdgeOne Blob Storage
       ↓
     /media/uploads/xxx.png
```

### 1.2 为什么采用这套架构

相比传统服务器 + 数据库 CMS，这套架构更适合中小型官网：

- **无需服务器运维**：前台静态化，后台 API 由 Edge Functions 承担。
- **访问速度快**：静态页面和媒体资源都在 EdgeOne 体系内。
- **内容可版本化**：案例、服务、站点配置写回 Gitee 仓库，可审计、可回滚。
- **图片不污染 Git 仓库**：图片使用 EdgeOne Blob，避免每次上传图片触发构建。
- **迁移成本低**：另一个官网只需要替换内容、环境变量、品牌资源即可复用。
- **安全边界清晰**：管理后台登录、Gitee token、Blob 访问都在服务端 Edge Functions 中处理。

---

## 2. 项目目录结构

```text
.
├── edge-functions/                 # EdgeOne Functions
│   ├── _lib/                        # 函数公共库
│   │   ├── auth.js                  # 后台登录鉴权与 session 校验
│   │   ├── blob.js                  # EdgeOne Blob 读写、列表、删除
│   │   ├── github.js                # 历史命名，实际为 Gitee 内容 API 封装
│   │   └── response.js              # JSON / Error 响应工具
│   ├── admin/[[default]].js         # /admin 兜底拦截，配合 ADMIN_PATH 使用
│   ├── api/
│   │   ├── login.js                 # 后台登录接口
│   │   ├── site.js                  # 站点配置读写接口
│   │   ├── upload.js                # 图片上传接口，支持 gitee/blob 两种存储
│   │   ├── uploads.js               # Blob 图片列表与删除接口
│   │   ├── media.js                 # 兼容旧 /api/media?key=... 读取
│   │   ├── cleanup-images.js        # Gitee 图片清理接口
│   │   ├── test-ping.js             # 函数连通性测试接口
│   │   └── content/                 # 案例/服务内容管理接口
│   ├── media/[[default]].js         # 美化媒体 URL：/media/uploads/xxx.png
│   └── __tests__/                   # Edge Functions 测试
├── scripts/
│   ├── configure-admin-path.mjs     # 构建后移动后台路径并禁用 /admin
│   └── copy-edge-functions.mjs      # 构建后复制 edge-functions 到 dist
├── src/
│   ├── content/
│   │   ├── cases/                   # 案例 Markdown 内容
│   │   ├── services/                # 服务 Markdown 内容
│   │   └── site.json                # 站点配置
│   ├── layouts/Base.astro           # 全站基础布局、导航、页脚
│   ├── pages/
│   │   ├── index.astro              # 首页
│   │   ├── about.astro              # 关于我们
│   │   ├── services/index.astro     # 服务页
│   │   ├── cases/                   # 案例列表与详情
│   │   ├── contact.astro            # 联系页
│   │   └── admin/index.astro        # 后台管理页面
│   └── styles/global.css            # 全局样式
├── .env.example                     # 环境变量示例
├── package.json                     # npm 脚本与依赖
└── README.md                        # 当前文档
```

---

## 3. 本地开发

### 3.1 安装依赖

```bash
npm install
```

### 3.2 启动开发服务器

```bash
npm run dev
```

默认访问：

```text
http://localhost:4321/
```

### 3.3 本地构建

```bash
npm run build
```

构建命令实际会执行：

```bash
astro build && node scripts/configure-admin-path.mjs && node scripts/copy-edge-functions.mjs
```

含义：

1. `astro build`：生成静态页面到 `dist/`。
2. `configure-admin-path.mjs`：按 `ADMIN_PATH` 移动后台页面。
3. `copy-edge-functions.mjs`：复制 `edge-functions/` 到 `dist/edge-functions/`，供 EdgeOne Makers 识别。

### 3.4 运行测试

```bash
npm test
```

测试重点覆盖：

- Edge Functions 模块能否正常 import。
- Gitee 内容 API 封装是否按创建/更新使用正确方法。
- Frontmatter 解析与生成。
- 上传、媒体、管理接口的基本 smoke test。

---

## 4. EdgeOne Makers 部署说明

### 4.1 推荐构建配置

EdgeOne Makers 项目中建议使用：

```text
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

如果日志中看到以下内容，说明 Functions 已被正确编译：

```text
[copy-edge-functions] copied edge-functions/ to dist/edge-functions/
[cli] ✨ Compiled edge functions successfully
[injectHooks] bundle size: ...
```

### 4.2 Functions 是否正常的判断

部署后访问：

```text
https://你的域名/api/test-ping
```

预期返回：

```text
pong
```

如果控制台“函数”为空，优先检查：

1. `npm run build` 是否执行了 `copy-edge-functions.mjs`。
2. `edge-functions/` 是否成功复制到 `dist/edge-functions/`。
3. 构建日志是否出现 `Could not resolve` import 错误。
4. 是否出现 `[cli] ✨ Compiled edge functions successfully`。

---

## 5. 环境变量配置

请在 EdgeOne Makers 项目设置的环境变量中配置。不要把真实 token、密码、secret 提交到仓库。

### 5.1 Gitee 内容仓库

```env
GITEE_TOKEN=your_gitee_access_token_here
GITEE_OWNER=sw586
GITEE_REPO=13982.com
GITEE_BRANCH=main
GITEE_API_BASE=https://gitee.com/api/v5
```

说明：

- `GITEE_TOKEN`：用于读写内容文件的 Gitee 访问令牌。
- `GITEE_OWNER`：仓库所属用户或组织。
- `GITEE_REPO`：仓库名。
- `GITEE_BRANCH`：内容写入分支。
- `GITEE_API_BASE`：默认 Gitee API 地址，通常无需修改。

注意：如果你把这套架构迁移到另一个官网，需要改为新仓库的 owner/repo/branch/token。

### 5.2 后台登录

```env
ADMIN_USER=admin
ADMIN_PASS_HASH=your_hmac_sha256_hex_of_password
SESSION_SECRET=your_session_signing_secret
ADMIN_PATH=/sw
```

`ADMIN_PASS_HASH` 必须用 `SESSION_SECRET` 对后台明文密码做 HMAC-SHA256 生成。

生成示例：

```bash
SESSION_SECRET='你的_SESSION_SECRET' ADMIN_PASS='你的后台密码' node -e "const { createHmac } = require('crypto'); console.log(createHmac('sha256', process.env.SESSION_SECRET).update(process.env.ADMIN_PASS).digest('hex'))"
```

`ADMIN_PATH` 用于把后台移动到非 `/admin` 路径，例如：

```env
ADMIN_PATH=/sw
```

部署后访问：

```text
https://你的域名/sw/
```

如果 `ADMIN_PATH` 是 `/admin` 或未配置，则保持默认 `/admin/`。

> 安全提醒：隐藏后台路径不是完整安全方案，它只是降低通用路径暴露风险。真正安全仍依赖强密码、稳定的 `SESSION_SECRET`、安全的 token 管理和 HTTPS。

### 5.3 图片上传与 Blob 存储

推荐使用 EdgeOne Blob：

```env
UPLOAD_STORAGE=blob
UPLOAD_MAX_BYTES=10485760
UPLOAD_ALLOWED_EXTS=png,jpg,jpeg,gif,webp,svg
BLOB_STORE=uploads
BLOB_PREFIX=uploads
BLOB_READ_CONSISTENCY=strong
```

说明：

- `UPLOAD_STORAGE=blob`：图片上传到 EdgeOne Blob，不触发 Gitee commit，不触发重新构建。
- `BLOB_STORE=uploads`：Blob 命名空间名称。EdgeOne Pages Blob 通常会在首次 `getStore()` 调用时自动创建。
- `BLOB_PREFIX=uploads`：对象 key 前缀，最终 URL 类似 `/media/uploads/xxx.png`。
- `BLOB_READ_CONSISTENCY=strong`：测试和后台即时预览推荐使用 strong。
- `UPLOAD_MAX_BYTES=10485760`：10MB 限制。
- `UPLOAD_ALLOWED_EXTS`：允许上传的图片扩展名。

兼容旧方案：如果你希望图片仍写入 Gitee 仓库，可以配置：

```env
UPLOAD_STORAGE=gitee
UPLOAD_DIR=public/images/uploads
UPLOAD_URL_PREFIX=/images/uploads
```

但不推荐长期使用 Gitee 存图片，因为每次上传都可能触发一次构建，且会使仓库体积持续增长。

---

## 6. 内容管理模型

### 6.1 案例内容

案例文件位于：

```text
src/content/cases/*.md
```

Frontmatter 字段：

```yaml
---
title: "案例标题"
description: "案例简介"
thumbnail: "/media/uploads/example.png"
tags: ["企业官网", "小程序"]
date: 2026-06-17
---

案例正文内容。
```

对应 Astro schema：

- `title`：必填，案例标题。
- `description`：必填，列表和详情摘要。
- `thumbnail`：可选，封面图。
- `tags`：数组，默认为空。
- `date`：日期。

### 6.2 服务内容

服务文件位于：

```text
src/content/services/*.md
```

当前建议的软件开发公司服务方向：

- 企业官网建设
- 小程序开发
- APP 开发
- 业务系统定制
- 管理后台与 CMS
- 云部署与运维

Frontmatter 字段：

```yaml
---
title: "企业官网建设"
description: "服务简介"
icon: "globe"
order: 1
---

服务详情内容。
```

对应 Astro schema：

- `title`：必填，服务名称。
- `description`：必填，服务简介。
- `icon`：可选，前端映射图标。
- `order`：排序，数字越小越靠前。

### 6.3 站点配置

站点配置位于：

```text
src/content/site.json
```

用于管理：

- 站点名称
- Logo
- slogan / 描述
- 电话
- 微信号
- 微信二维码
- 地址
- ICP 备案号
- 首页统计数据

后台中该模块显示为“站点配置”，尽量通过表单填写，避免直接编辑 JSON。

---

## 7. 后台管理功能

后台页面源文件：

```text
src/pages/admin/index.astro
```

后台接口：

| 功能 | 接口 | 说明 |
|---|---|---|
| 登录 | `POST /api/login` | 校验管理员账号密码 |
| 站点配置 | `/api/site` | 读写 `src/content/site.json` |
| 内容列表 | `/api/content` | 管理案例和服务 |
| 内容详情 | `/api/content/item` | 新增/编辑/删除单个内容文件 |
| 图片上传 | `POST /api/upload` | 上传到 Blob 或 Gitee |
| 图片列表/删除 | `/api/uploads` | Blob 图片管理 |
| 媒体读取 | `/media/*` | 美化后的图片访问 URL |
| 媒体读取兼容 | `/api/media?key=...` | 旧版兼容入口 |
| 函数测试 | `/api/test-ping` | 返回 `pong` |

### 7.1 后台路径移动机制

源码中后台页面仍然位于：

```text
src/pages/admin/index.astro
```

Astro 构建后会生成：

```text
dist/admin/index.html
```

如果配置：

```env
ADMIN_PATH=/sw
```

构建脚本会：

1. 复制 `dist/admin/` 到 `dist/sw/`。
2. 把 `dist/admin/index.html` 替换为 404 页面。
3. Edge Function `edge-functions/admin/[[default]].js` 也会在运行时兜底拦截 `/admin/*`。

### 7.2 媒体库机制

Blob 上传成功后返回：

```text
/media/uploads/xxxxxxxxxxxxxxxx.png
```

实际 Blob key：

```text
uploads/xxxxxxxxxxxxxxxx.png
```

`edge-functions/media/[[default]].js` 会把 `/media/uploads/...` 转换为 Blob key 并读取对象。

---

## 8. 迁移到另一个官网的操作清单

如果要把这套技术架构应用到另一个官网，建议按下面步骤操作。

### 8.1 复制项目并替换基础信息

需要修改：

```text
package.json
src/content/site.json
src/content/cases/
src/content/services/
src/pages/index.astro
src/pages/about.astro
src/pages/contact.astro
src/layouts/Base.astro
```

通常优先替换：

- 公司名称
- Logo
- 联系电话
- 微信二维码
- 地址
- 首页 Hero 文案
- 服务项目
- 案例内容
- SEO 标题与描述

### 8.2 创建新的 Gitee 仓库

新官网建议使用独立仓库。然后在 EdgeOne 环境变量中配置：

```env
GITEE_OWNER=新 owner
GITEE_REPO=新 repo
GITEE_BRANCH=main
GITEE_TOKEN=新 token
```

### 8.3 配置新的后台账号

为新项目单独生成：

```env
ADMIN_USER=新后台账号
SESSION_SECRET=新的随机 secret
ADMIN_PASS_HASH=用新密码和新 secret 生成的 hash
ADMIN_PATH=/不易猜到的新路径
```

不要复用旧项目的 `SESSION_SECRET` 和 token。

### 8.4 配置 Blob

推荐保持：

```env
UPLOAD_STORAGE=blob
BLOB_STORE=uploads
BLOB_PREFIX=uploads
BLOB_READ_CONSISTENCY=strong
```

如果一个 EdgeOne 项目下管理多个站点，建议为不同站点使用不同前缀，例如：

```env
BLOB_PREFIX=site-a/uploads
```

### 8.5 首次部署后验证

按顺序检查：

1. 首页是否正常打开。
2. `/api/test-ping` 是否返回 `pong`。
3. 新后台路径是否能打开。
4. `/admin/` 是否已经不可用。
5. 后台登录是否成功。
6. 站点配置是否能保存。
7. 案例/服务是否能新增、编辑、删除。
8. 图片是否能上传并通过 `/media/uploads/...` 访问。

---

## 9. 常见问题排查

### 9.1 EdgeOne 控制台“函数”为空

检查构建日志是否出现：

```text
[copy-edge-functions] copied edge-functions/ to dist/edge-functions/
[cli] ✨ Compiled edge functions successfully
```

如果没有，检查：

- `package.json` 的 build 是否为 `astro build && node scripts/configure-admin-path.mjs && node scripts/copy-edge-functions.mjs`。
- `scripts/copy-edge-functions.mjs` 是否存在。
- `edge-functions/` 下是否有 import 路径错误。

### 9.2 后台登录失败

检查：

- `ADMIN_USER` 是否正确。
- `ADMIN_PASS_HASH` 是否由当前 `SESSION_SECRET` 和真实密码生成。
- `SESSION_SECRET` 是否已配置。
- `/api/login` 是否能被 Edge Functions 处理。

### 9.3 `/admin` 仍然能打开

检查构建日志中是否出现：

```text
[configure-admin-path] admin UI moved to /你的路径/ and /admin/ was disabled
```

如果没有，说明：

- `ADMIN_PATH` 未配置，或仍是 `/admin`。
- EdgeOne 没有部署最新代码。
- 构建命令没有执行 `configure-admin-path.mjs`。

### 9.4 图片上传后不能显示

检查：

- `UPLOAD_STORAGE` 是否为 `blob`。
- `@edgeone/pages-blob` 是否安装成功。
- 构建日志是否显示 Functions 编译成功。
- 返回 URL 是否是 `/media/uploads/...`。
- Blob 页面是否出现 `uploads` 命名空间和对象。
- `BLOB_PREFIX` 与 URL key 是否一致。

### 9.5 Gitee API 返回 400 / 401 / 403

常见原因：

- `GITEE_TOKEN` 权限不足或已失效。
- `GITEE_OWNER` / `GITEE_REPO` / `GITEE_BRANCH` 配错。
- token 对目标仓库没有写权限。
- 创建文件路径的父目录不存在。
- 分支保护限制提交。

---

## 10. 安全建议

- 不要在聊天记录、README、源码中写真实 token 和密码。
- 泄露过的 `GITEE_TOKEN` 应立即吊销并重新生成。
- 每个项目使用独立的 `SESSION_SECRET`。
- `ADMIN_PATH` 不要使用 `/admin`、`/manage`、`/cms` 等常见路径。
- 后台密码应足够长，建议使用密码管理器生成。
- Blob 读取接口限制 key 必须在 `BLOB_PREFIX` 下，避免任意对象读取。
- Gitee token 尽量使用最小权限。
- 部署钩子 URL 如果启用，必须当作密钥保存。

---

## 11. 后续优化建议

### 11.1 SEO

建议继续补齐：

- 每页独立 `title` / `description`。
- canonical。
- Open Graph / Twitter Card。
- `sitemap.xml`。
- `robots.txt`。
- LocalBusiness JSON-LD。
- BreadcrumbList 结构化数据。
- 服务详情页 `/services/[slug]/`。

### 11.2 内容模型

建议后续将以下内容后台可配置化：

- 首页 Hero。
- 首页统计数据。
- 首页推荐服务。
- 首页推荐案例。
- 首页流程模块。
- FAQ。
- SEO 字段。
- 联系页二维码和 CTA。

### 11.3 媒体库

建议继续增强：

- 图片分组。
- 图片 alt 文案。
- 未引用图片扫描。
- 图片压缩与 WebP 转换。
- 批量删除。
- 图片使用位置反查。

### 11.4 多站点复用

如果未来多个官网都用这套架构，建议抽象为：

```text
通用模板仓库
  ├── Edge Functions CMS 能力
  ├── Blob 媒体库能力
  ├── Admin UI
  └── Astro 页面模板

业务官网仓库
  ├── 品牌内容
  ├── 页面文案
  ├── 案例服务内容
  └── 环境变量
```

这样每次新建官网只需复制模板，替换内容和变量即可。

---

## 12. 命令速查

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build

# 测试
npm test

# 用指定后台路径测试构建脚本
ADMIN_PATH=/sw npm run build

# 检查构建产物中后台路径
find dist -maxdepth 2 -type f | sort | sed -n '1,80p'
```

---

## 13. 项目维护原则

- 内容优先放在 `src/content/`，不要硬编码到页面里，除非是纯展示结构。
- 图片优先上传到 EdgeOne Blob，避免放入 Git 仓库。
- Edge Functions 公共逻辑放在 `edge-functions/_lib/`。
- 新增 API 后，尽量在 `edge-functions/__tests__/api-smoke.test.mjs` 加 import smoke test。
- 修改构建流程后，一定检查 EdgeOne 日志中的 Functions 编译结果。
- 面向生产环境时，所有密钥只放 EdgeOne 环境
