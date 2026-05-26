# 13982.com 官网迁移项目交接文档

## 项目概述

将滇码科技官网（13982.com）从 DianMaCMS (PHP+MySQL) 迁移到 Astro 静态站点，部署到腾讯云 EdgeOne Pages。

**目标**：中国区快速访问 + 完全免费 + Web 管理后台编辑内容

## 架构设计

```
GitHub Repo (suwei8/13982.com)
├── src/
│   ├── content/          ← Markdown 内容文件 (GitHub 就是数据库)
│   │   ├── cases/        ← 客户案例 (6个)
│   │   ├── services/     ← 产品服务 (19个)
│   │   └── site.json     ← 公司信息
│   ├── pages/            ← Astro 页面路由
│   ├── components/       ← 组件
│   └── layouts/          ← 布局
├── public/
│   └── images/           ← 图片资源 (26张)
├── admin/                ← 管理后台 SPA
└── astro.config.mjs
         │
         │ git push → EdgeOne Pages 自动构建
         ▼
    13982.com (静态 HTML, 中国 CDN)
    13982.com/admin/ (管理后台)
```

**零后端，零数据库，零服务器费用。**

## 已完成的工作

### 1. 数据导出 ✓
- 从 MySQL 导出 6 个客户案例到 `src/content/cases/*.md`
- 从 MySQL 导出 19 个服务分类到 `src/content/services/*.md`
- 导出公司信息到 `src/content/site.json`
- 复制 26 张图片到 `public/images/cases/`

### 2. 前端设计 ✓
- 全新设计的 5 个页面：首页、关于我们、产品服务、客户案例、联系我们
- 响应式布局，现代 CSS 设计
- 导航栏、Hero 区域、卡片网格、页脚

### 3. 管理后台 ✓
- 纯前端 SPA，部署在 `/admin/` 路径
- 通过 GitHub API 直接读写仓库内容
- 支持：案例 CRUD、服务 CRUD、图片上传
- 认证方式：GitHub Personal Access Token (PAT)

### 4. GitHub 仓库 ✓
- 仓库地址：`git@github.com:suwei8/13982.com.git`
- 代码已推送到 `main` 分支

### 5. EdgeOne Pages 部署 ✗ (待完成)

## 新服务器上的操作步骤

### 环境准备

```bash
# 1. 安装 Node.js 22+
curl -fsSL https://nodejs.org/dist/v22.16.0/node-v22.16.0-linux-x64.tar.xz -o node22.tar.xz
tar -xf node22.tar.xz
export PATH="$PWD/node-v22.16.0-linux-x64/bin:$PATH"

# 2. 配置 npm 国内镜像
npm config set registry https://registry.npmmirror.com

# 3. 克隆仓库
git clone git@github.com:suwei8/13982.com.git
cd 13982.com

# 4. 安装依赖
npm install
```

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 构建静态站点
npm run build

# 预览构建结果
npx serve dist -l 4321
```

### 部署到 EdgeOne Pages

**方式一：EdgeOne CLI**

```bash
# 安装 CLI
npm install -g edgeone

# 使用 API Token 部署
edgeone pages deploy dist --token=vjLWFzZqxcEyhxBTSh1/epnchZYgb1oLftbmhOhI8xc=
```

**方式二：控制台 Git 集成（推荐）**

1. 打开 https://console.cloud.tencent.com/edgeone/pages
2. 创建项目 → 导入 Git 仓库
3. 授权 GitHub，选择 `suwei8/13982.com`
4. 构建配置：
   - 框架预设：Astro
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node 版本：22
5. 自定义域名：添加 `13982.com`
6. 后续 git push 自动触发构建部署

### 管理后台使用

1. 访问 `https://13982.com/admin/`
2. 输入 GitHub PAT 登录（需要 `repo` 权限）
3. 可以管理案例和服务内容
4. 保存后自动 commit 到 GitHub，触发 EdgeOne Pages 重新构建

## 凭证信息

凭证已保存在本地环境变量文件中，新服务器上需要重新配置：

- **腾讯云 API**：在腾讯云控制台获取 APPID、SecretId、SecretKey
- **EdgeOne Pages API Token**：在 EdgeOne Pages 控制台获取
- **GitHub**：仓库 `git@github.com:suwei8/13982.com.git`，需配置 SSH Key
- **旧站 MySQL**：如需再次导出数据，需要数据库凭证（联系管理员获取）

## 文件结构

```
13982.com/
├── astro.config.mjs          # Astro 配置
├── package.json               # 依赖管理
├── tsconfig.json              # TypeScript 配置
├── .gitignore
├── HANDOFF.md                 # 本交接文档
├── scripts/
│   └── export-mysql.py        # MySQL 数据导出脚本
├── src/
│   ├── content.config.ts      # 内容集合配置
│   ├── content/
│   │   ├── cases/             # 6 个案例 Markdown
│   │   ├── services/          # 19 个服务 Markdown
│   │   └── site.json          # 公司信息
│   ├── layouts/
│   │   └── Base.astro         # 基础布局（导航+页脚）
│   └── pages/
│       ├── index.astro        # 首页
│       ├── about.astro        # 关于我们
│       ├── contact.astro      # 联系我们
│       ├── admin/
│       │   └── index.astro    # 管理后台 SPA
│       ├── cases/
│       │   ├── index.astro    # 案例列表
│       │   └── [slug].astro   # 案例详情（动态路由）
│       └── services/
│           └── index.astro    # 服务列表
└── public/
    └── images/
        └── cases/             # 26 张案例图片
```

## 参考项目

用户已有的项目，架构模式可参考：
- `git@github.com:suwei8/MyInput.git` — GitHub-as-Database 模式，Hono + Vue 3
- `git@github.com:suwei8/FluxPay.git` — 管理后台设计，HMAC Token 认证

## 待优化项

- [ ] 完善管理后台 UI（当前为基础版本）
- [ ] 添加 HMAC Token 认证（替代直接暴露 PAT）
- [ ] 图片懒加载优化
- [ ] SEO 元数据完善
- [ ] 404 页面
- [ ] EdgeOne Pages 自定义域名 + HTTPS 配置

## 旧站信息

旧站使用 DianMaCMS 4.6.4（基于 XunRuiCMS + Laravel 9）：
- 源码位置：`/srv/client-web/www/13982.com/`
- 活跃模板：`sw586`
- Docker 容器：client-web-mysql, client-web-php74, client-web-nginx

迁移完成后可停止旧站 Docker 容器释放内存（当前占用约 467MB）。
