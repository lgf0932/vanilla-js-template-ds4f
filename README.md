# Project Name

> 纯 JavaScript、零第三方依赖的模块化应用架构。侧边栏 + 顶栏布局，Web Components 组件库，同构后端一份代码部署 Cloudflare / Vercel / Deno / Docker，本地 SQLite / Cloudflare D1 / Turso 自动切换。

深入架构设计请看 [`ARCHITECTURE.md`](./ARCHITECTURE.md)；AI/开发者协作规则请看 [`AGENTS.md`](./AGENTS.md)。

---

## ✨ 核心特性

- **零第三方运行时依赖**：`dependencies` / `devDependencies` 永远为空，全部基于浏览器与 JS 运行时标准 API 手写实现。
- **模块化 + 强解耦**：侧边栏一级菜单 = 一个模块，二级菜单 = 子模块，模块间禁止相互引用，新增模块不改动壳层代码。
- **统一 UI 语言**：自研 "Nova" 设计系统（shadcn 视觉语言 + zinc 色板，纯手写实现），全站禁用浏览器默认弹窗/控件视觉。
- **三态暗黑模式**：系统 / 浅色 / 深色，三段式胶囊切换。
- **响应式 + 高信息密度**：移动端抽屉式侧边栏，卡片类组件严格遵循"反留白"规则。
- **数据库自动选型**：开发环境本地 SQLite；部署到 Cloudflare 自动用 D1（可切 Turso）；部署到其它平台自动用 Turso。
- **四平台同构部署**：Cloudflare / Vercel / Deno / Docker，后端核心代码 100% 复用。
- **多语言**：简体中文 / 繁体中文 / English，按模块懒加载语言包。
- **安全默认项**：单密码全局鉴权（`X-Auth-Password`，无状态派生令牌）+ 敏感字段 AES-GCM 加密。
- **体积/性能预算化**：首屏 JS ≤ 40KB(gzip)，单模块增量 chunk ≤ 15KB(gzip)，CI 强制校验。

---

## 🧱 技术栈

| 层 | 方案 |
|---|---|
| 前端组件 | 原生 Web Components（Custom Elements + Shadow DOM） |
| 前端构建 | Zero-Build：原生 ESM + Import Map + 模块懒加载 |
| 后端 | 统一 `Request → Response` 标准函数，四平台薄适配层 |
| 数据库 | `node:sqlite` / Cloudflare D1 / Turso（HTTP 协议直连） |
| 加密/鉴权 | Web Crypto（AES-GCM / PBKDF2 / HMAC） |
| 测试 | `node:test` |
| Lint | 手写规则脚本 |

> 详细选型理由与架构决策记录见 `ARCHITECTURE.md`。

---

## 🚀 快速开始

**环境要求**：Node ≥ 22（用于内置 `node:sqlite`）。

```bash
git clone <repo-url>
cd <repo>
cp .env.example .env      # 按需填写，见下方环境变量说明
just dev                  # 本地开发服务器（Node 适配器 + 本地 SQLite）
```

首次启动会自动执行数据库迁移并写入初始 `app_settings`。打开浏览器访问本地地址后，会先看到统一的密码设置/输入页（鉴权系统，见下文）。

### 直接双击 `index.html`

也可以直接双击仓库根目录的 `index.html`：

- 页面会自动切换到 `file://` 本地预览模式，并使用 hash 路由，避免修改本地文件路径；
- 本地模式只绕过服务端鉴权，不要求输入密码，也不会创建或发送鉴权令牌；
- 仪表盘、笔记/标签 CRUD、对话消息、个人资料、主题/语言、安全选项和数据库状态等功能均可操作；
- 本地文件没有后端数据库，数据默认保存到当前浏览器的 IndexedDB；如果浏览器禁用 IndexedDB 才降级为当前页面内存。需要 SQLite 持久化、多设备数据和真实服务端鉴权时，使用 `just dev`。

---

## 📁 目录速览

```
app/       前端 SPA（core / components / styles / lib / modules）
server/    同构后端（core / db / modules / adapters）
shared/    前后端共享常量与校验规则
scripts/   开发 / 构建 / 校验脚本
docs/      架构决策记录（ADR）
```

完整目录结构与每层职责说明见 [`ARCHITECTURE.md`](./ARCHITECTURE.md#2-目录结构总览)。

---

## 🛠 常用命令（justfile）

| 命令 | 作用 |
|---|---|
| `just dev` | 启动本地开发服务器 |
| `just db:migrate` | 执行数据库迁移 |
| `just db:seed` | 写入演示数据 |
| `just lint` | 代码规范检查（含禁用模式扫描） |
| `just test` | 运行测试 |
| `just i18n:check` | 校验三语言文案完整性 |
| `just build` | 生产构建（指纹化 + 压缩，无打包器） |
| `just build:budget` | 体积预算校验 |
| `just deploy:cloudflare` / `deploy:vercel` / `deploy:deno` / `deploy:docker` | 部署到对应平台 |

---

## ⚙️ 环境变量

| 变量 | 说明 | 必填 |
|---|---|---|
| `AUTH_PASSWORD_HASH` | 管理密码哈希，覆盖数据库中的 `settings:auth:password_hash` | 生产环境建议设置 |
| `ENCRYPTION_KEY` | 敏感字段信封加密主密钥 | 是 |
| `DB_DRIVER` | 显式指定 `sqlite`/`d1`/`turso`，不设置则按平台自动选型 | 否 |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Turso 连接信息（Vercel/Deno/Docker 默认数据库） | 使用 Turso 时必填 |
| `D1_BINDING` | Cloudflare D1 绑定名（wrangler.toml 中声明） | Cloudflare 部署时必填 |

数据库自动选型逻辑详见 [`ARCHITECTURE.md` 4.4 节](./ARCHITECTURE.md#44-数据库分层适配器模式--自动选型)。

---

## ☁️ 部署

| 平台 | 命令 | 默认数据库 |
|---|---|---|
| Cloudflare Pages/Workers | `just deploy:cloudflare` | D1 |
| Vercel | `just deploy:vercel` | Turso |
| Deno Deploy | `just deploy:deno` | Turso |
| Docker/VPS | `just deploy:docker` | Turso（可切本地 SQLite） |

CI/CD 流水线（GitHub Actions）说明见 [`ARCHITECTURE.md` 第 6 节](./ARCHITECTURE.md#6-构建--自动化)。

---

## 🌐 多语言

当前支持：简体中文（`zh-CN`）、繁体中文（`zh-TW`）、English（`en`）。每个模块自带语言包，随模块懒加载，新增文案流程见 [`AGENTS.md` 第 7 节](./AGENTS.md#7-i18n-新增文案流程)。

---

## 🔐 安全性

- 全局单密码鉴权（`X-Auth-Password`），会话时长可选 4/8/12/24 小时、7/14/30/90 天，或"直到下次浏览器打开"；
- 密码仅存哈希，不存明文；
- 用户信息、大模型 API Key、第三方 Token 等敏感字段均使用 AES-GCM 加密落库，不做明文存取；

详见 [`ARCHITECTURE.md` 4.3、4.6 节](./ARCHITECTURE.md#43-鉴权系统x-auth-password)。

---

## 🤝 贡献指南

提交前请阅读 [`AGENTS.md`](./AGENTS.md)，遵循：

- 新增模块/子模块的标准流程（不修改壳层代码）；
- Conventional Commits 规范，**正文必须逐文件说明改动到方法/组件级别**；
- 提交前自检清单（lint / test / i18n:check / build:budget 全部通过）。

---

## 📄 License

TBD
