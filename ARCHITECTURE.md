# ARCHITECTURE.md

> 本文档是本项目的唯一架构真源（Source of Truth）。任何架构级变更（新增模块类型、更换数据库适配器、调整鉴权机制等）必须先修改本文档，再落地代码。AI 协作规则见 `AGENTS.md`，使用与部署速览见 `README.md`。

---

## 0. 设计哲学

1. **零第三方运行时依赖**：`package.json` 的 `dependencies` / `devDependencies` 永远为空对象。所有能力（路由、组件、状态、加密、DB 驱动、缓存）均基于浏览器 / JS 运行时**标准 API**（ES Modules、Custom Elements、Shadow DOM、Fetch、Web Crypto、`node:sqlite`、`node:test` 等）手写实现。
2. **约定优于配置**：模块、子模块、样式、i18n、DB 表都遵循强约定，新增业务不需要理解全局代码，只需要遵循目录 + 命名约定。
3. **平台无关的业务核心**：业务逻辑（前端组件 / 后端 service）不感知自己跑在 Cloudflare 还是 Docker 里，平台差异全部收敛在薄薄的"适配器层"。
4. **体积与延迟是一等公民**：不引入构建工具，靠"模块懒加载 + 精简手写代码"天然控制体积；每一层都有可度量的预算（见第 4.8 节）。
5. **视觉与交互只有一套语言**：全站禁止使用浏览器默认控件观感（`alert/confirm/prompt`、原生 `<select>` 默认样式等），一切 UI 都走同一套 Design Token（"Nova" 设计系统，参考 shadcn/ui 的视觉语言 + zinc 色板，纯手写实现，不引入 shadcn/Radix/Tailwind 源码或依赖）。

---

## 1. 技术选型与"零依赖"边界声明

| 层 | 选型 | 说明 |
|---|---|---|
| 前端组件化 | 原生 **Custom Elements + Shadow DOM** | 无 React/Vue/Svelte，组件天然样式隔离、天然可复用 |
| 前端状态 | 手写 Proxy 响应式 Store + 事件总线 | 每模块私有 store，不做全局单一大 store |
| 前端路由 | 手写 History API 路由（`app/core/router.js`） | 与模块注册表联动，见第 3.2 节 |
| 构建 | **Zero-Build（原生 ESM + Import Map）** | 开发环境不打包；生产环境仅做"文件指纹 + 极简手写压缩"，见第 4.8 节 |
| 后端框架 | 无框架，统一基于 **Web 标准 `Request → Response`** 的手写路由 | 详见第 4.1 节，是兼容四平台的核心设计 |
| 数据库驱动 | `node:sqlite`（本地/Docker）、Cloudflare D1 原生绑定、Turso HTTP(Hrana) 协议（`fetch` 直连，不装 `@libsql/client`） | 均为运行时内置能力或标准 HTTP 调用，无 SDK 包 |
| 加密/哈希 | Web Crypto `crypto.subtle`（AES-GCM / PBKDF2） | 四个运行时全部原生支持 |
| 测试 | `node:test` + `node:assert` | 不装 Jest/Vitest |
| Lint | 手写规则脚本（`scripts/lint.js`，语法用 `node --check`，风格/禁用项用正则规则集） | 不装 ESLint |

**"零依赖"边界澄清**：`wrangler`、`vercel`、`deno`、`docker` 等 **平台官方 CLI** 属于"部署工具链"，通过 `npx <cli>@版本号` 临时下载执行、不写入 `package.json` 的 `dependencies`/`devDependencies`、不参与应用产物打包，因此不违反"零第三方运行时依赖"原则，仅作为 CI/CD 的外部工具使用（见第 6 节）。CI 中有 `deps-check` 任务强制校验 `dependencies`/`devDependencies` 为空。

---

## 2. 目录结构总览

```
.
├── app/                        # 前端 SPA
│   ├── core/                   # 壳层核心：router / store / i18n / theme / auth / bootstrap
│   ├── file-preview.js          # file:// 双击预览入口（IndexedDB、本地 API）
│   ├── components/
│   │   ├── ui/                 # 基础 UI 组件库（Nova 设计系统，跨模块复用）
│   │   └── layout/              # app-shell / app-sidebar / app-header / app-main
│   ├── styles/                 # tokens.css / reset.css / utilities.css / animations.css
│   ├── lib/                    # 纯函数工具库（fetcher / format / validate / event-bus ...）
│   ├── locales/                # 壳层通用文案（common.*, sidebar.*, auth.*）
│   └── modules/                 # 业务模块，一级目录 = 侧边栏一级菜单
│       ├── registry.js          # 模块注册表（唯一需要"手动登记新模块"的文件）
│       ├── dashboard/
│       ├── notes/
│       │   ├── module.config.js
│       │   ├── index.js
│       │   ├── store.js
│       │   ├── api.js
│       │   ├── components/       # 模块私有组件，禁止被其它模块 import
│       │   ├── submodules/       # 子菜单 = 子模块
│       │   │   ├── notes-list/
│       │   │   └── notes-tags/
│       │   └── locales/{zh-CN,zh-TW,en}.json
│       └── settings/
│           └── submodules/{profile,display,security,database}/
│
├── server/                     # 同构后端
│   ├── core/                   # router / middleware / auth / crypto / cache / context
│   ├── db/
│   │   ├── adapter.interface.js
│   │   ├── adapters/{sqlite,d1,turso}.adapter.js
│   │   ├── resolver.js         # 运行时探测 + 自动选型
│   │   ├── migrations/*.sql
│   │   └── query/*.queries.js  # 各模块 SQL 集中管理
│   ├── modules/                # 与前端模块一一对应的 routes.js + service.js
│   ├── adapters/                # 平台入口适配器
│   │   ├── cloudflare.entry.js
│   │   ├── vercel.entry.js
│   │   ├── deno.entry.js
│   │   └── node.entry.js
│   └── app.js                  # 合并各模块路由，运行时无关
│
├── shared/                     # 前后端共享常量 / 校验规则 / JSDoc 类型
├── scripts/                    # dev-server / db-migrate / i18n-check / lint / bundle-budget-check
├── public/                     # 静态资源（图标、favicon）
├── tests/                      # 端到端测试（单元测试与源码同目录 *.test.js）
├── docs/decisions/              # ADR（架构决策记录）
├── .github/workflows/
├── justfile
├── Dockerfile
├── package.json                 # dependencies/devDependencies 必须为空
├── README.md / ARCHITECTURE.md / AGENTS.md
```

---

## 3. 前端架构

### 3.1 应用骨架（Shell）与布局契约

**强约定（不可打破）**：

- 整体布局固定为 `sidebar-with-header`：`<app-shell>` 内部固定挂载 `<app-sidebar>` + `<app-header>` + `<app-main>` 三个区域，三者均为 `position: fixed`/`grid` 布局，不随内容伸缩。
- **仅 `<app-main>` 内部允许出现滚动条**（`overflow-y: auto`），`<app-sidebar>`、`<app-header>` 一律 `overflow: hidden`。若侧边栏菜单项过多，通过"分组折叠 + 图标态收缩（仅图标，hover 展开文字）"来避免溢出，禁止新增独立滚动区域。
- **新增业务模块只允许往 `<app-main>` 内部注入内容**，禁止任何模块代码触碰 `app-shell.js / app-sidebar.js / app-header.js`。侧边栏菜单项是从模块注册表（3.2 节）**自动派生**渲染的，不需要、也不允许手写菜单项。

```
┌───────────────────────────────────────────────┐
│ app-header（固定，不滚动：logo / 面包屑 / 主题切换 / 用户）│
├───────────┬───────────────────────────────────┤
│           │                                   │
│  app-     │            app-main               │
│  sidebar  │      （唯一滚动区域，模块视图挂载点）      │
│（固定不滚动） │                                   │
│           │                                   │
└───────────┴───────────────────────────────────┘
```

移动端（<640px）：`app-sidebar` 收为可呼出的抽屉（Drawer），`app-header` 出现汉堡按钮；`app-main` 独占全宽，滚动约定不变。

### 3.2 模块系统（Module Registry）

每个侧边栏一级菜单 = `app/modules/<id>/` 一个目录；每个二级菜单 = `submodules/<sub-id>/` 一个目录。模块之间**不允许相互 import 对方目录下的文件**（含组件、store、api），跨模块共享的东西必须先"毕业"到 `shared/` 或 `app/components/ui`，从而保证模块间解耦、互不影响。

**模块清单契约**（`module.config.js`，仅为接口形状说明，非实现）：

```js
/**
 * @typedef {Object} ModuleManifest
 * @property {string} id                 // 唯一 id，如 'notes'
 * @property {string} icon               // 复用 app/components/ui 的图标名
 * @property {number} order              // 侧边栏排序
 * @property {string} i18nNamespace      // 对应 locales/*.json 的命名空间
 * @property {() => Promise<any>} loadRoot   // 懒加载根视图，如 () => import('./index.js')
 * @property {SubmoduleManifest[]} [submodules]
 * @property {string[]} [requiredPermissions]
 */
```

`app/modules/registry.js` 是**唯一**需要手动登记新模块的文件（一行 `import()` 引用），`app/core/bootstrap.js` 据此：

1. 渲染 `<app-sidebar>` 菜单树（含子菜单）；
2. 注册路由表（`/notes`、`/notes/tags` ...）；
3. 按需懒加载对应模块的 JS + 该模块的语言包（合并一次网络请求）。

新增一个模块 = 新建目录 + `registry.js` 补一行，**不改任何壳层代码**，天然满足解耦要求。

### 3.3 组件库规范（Nova 设计系统 · Web Components）

- 全部基础组件位于 `app/components/ui/`，命名前缀 `ui-*`（如 `<ui-button>` `<ui-card>` `<ui-dialog>` `<ui-toast>` `<ui-radio-group>` `<ui-select>` `<ui-input>` `<ui-badge>` `<ui-tabs>`）。
- 每个组件是一个 Custom Element，内部使用 **Shadow DOM** 封装私有样式，只消费全局 CSS 变量（`--background` `--primary` `--radius` 等），不硬编码颜色/圆角/间距字面量，从而保证跨模块视觉 100% 统一且组件互不冲突。
- CSS 自定义属性可穿透 Shadow DOM 边界，因此暗黑模式切换只需要在 `<html>` 上切一个 `data-theme` 属性，无需逐组件处理。
- **严禁使用浏览器内置弹窗/控件视觉**：`window.alert/confirm/prompt`、原生 `<dialog>` 默认样式、原生 `<select>` 默认下拉，一律替换为 `<ui-toast>` `<ui-dialog>` `<ui-confirm>` `<ui-select>` 等自研组件（原因：无法定制视觉、无法适配暗色模式、体验碎片化）。
- 布局组件（`app-shell` `app-sidebar` `app-header` `app-main`）单独放在 `app/components/layout/`，与业务无关组件严格分离。
- 组件复用层级：`app/components/ui`（全局公共）→ `app/lib`（纯函数，无 DOM）→ 模块内 `components/`（模块私有，禁止跨模块引用）。任何被两个以上模块用到的组件/函数，必须"上移"到公共层，避免复制粘贴。

### 3.4 样式系统与设计令牌

`app/styles/tokens.css` 定义一套 shadcn 视觉语言（zinc 中性色板、语义化变量、统一圆角/阴影分级）的**纯手写复刻**，命名为项目内部代号 **"Nova"**：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --muted: 240 4.8% 95.9%;
  --border: 240 5.9% 90%;
  --radius: 0.5rem;
  --spacing-2: 0.5rem;  --spacing-3: 0.75rem;  --spacing-4: 1rem;
}
[data-theme="dark"] {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --muted: 240 3.7% 15.9%;
  --border: 240 3.7% 15.9%;
}
```

`app/styles/utilities.css` 是**按需手写的最小工具类子集**（flex/grid、间距、字号），只添加真正用到的类，禁止照搬 Tailwind 全量类库，以控制体积。

### 3.5 暗黑模式（三段式胶囊）

组件 `<ui-theme-switch>`：单一 pill 容器内三个分段 `系统 | 浅色 | 深色`（System / Light / Dark），选中态用滑块位移动画 + `--primary` 背景块。

- `system`：监听 `window.matchMedia('(prefers-color-scheme: dark)')`，动态写入 `<html data-theme="...">`；
- `light` / `dark`：直接写死 `data-theme`；
- 持久化到后端 `app_settings` 的 `settings:display` 键（见第 4.5 节），跨设备/刷新保持一致。

### 3.6 响应式与信息密度规则

- 断点：`mobile < 640px`、`tablet 640–1024px`、`desktop > 1024px`，全部通过 CSS 容器查询/媒体查询 + token 化的间距变量实现，不写死像素。
- **反留白铁律**（信息卡片类组件必须遵守）：
  1. 卡片默认内边距使用 `--spacing-3`（而非更大的 `--spacing-6`），避免大面积空白；
  2. 数值/指标类信息优先"加大字号 + 搭配图标"来撑满视觉重量，而不是靠留白撑版；
  3. 空状态（empty state）必须是"图标 + 一句引导文案 + 一个操作按钮"的组合，禁止出现纯空白区域；
  4. 一屏内同类卡片在窄屏下改为紧凑的单列堆叠，而不是保留大量左右留白的单列窄卡片。

### 3.7 状态管理 / 路由 / 函数库

- **Store**：`app/core/store.js` 提供一个极简的 Proxy 响应式容器工厂 `createStore(initialState)`，每个模块调用一次得到私有 store，不共享全局单一 store，天然解耦。
- **Router**：`app/core/router.js` 基于 `history.pushState` + `popstate`，路由表由模块注册表派生，支持二级路径映射子模块；检测到 `file://` 时改用 hash 路由，避免双击 `index.html` 后导航到磁盘路径。
- **Fetcher**：`app/lib/fetcher.js` 统一封装 `fetch`，自动附加 `X-Auth-Password` 请求头、统一错误处理、401 时触发 `app/core/auth.js` 的重新鉴权流程；`file://` 本地预览改由 `app/lib/offline-api.js` 提供 IndexedDB 数据层，浏览器不支持时降级为内存。
- **Event Bus**：`app/lib/event-bus.js` 提供跨模块的"发布/订阅"（仅用于必须跨模块通知的极少数场景，如全局 toast），不能替代模块间数据依赖——模块间原则上不应有数据依赖。

**直接文件预览模式**：根目录 `index.html` 仍是 HTTP 部署入口；当协议为 `file://` 时，入口改加载 `app/file-preview.js` 这一独立零依赖经典脚本，绕开浏览器对本地 ESM 的 CORS 限制。该入口直接进入完整的仪表盘、笔记/标签、对话和设置功能，只绕过服务端鉴权请求，不创建或发送鉴权令牌；数据层使用与正式 API 契约对应的浏览器 IndexedDB，IndexedDB 不可用时降级为当前页面内存。HTTP/部署模式仍加载 `app/core/bootstrap.js` 及完整模块系统。

### 3.8 国际化（i18n）

- 支持语言：`zh-CN`（简体中文）、`zh-TW`（繁体中文）、`en`（英文）。
- 每个模块自带 `locales/{zh-CN,zh-TW,en}.json`，key 采用命名空间前缀，如 `notes.title`、`notes.tags.empty`；壳层通用文案在 `app/locales/{lang}.json`，命名空间 `common.*` `sidebar.*` `auth.*`。
- 语言包随模块懒加载一起按需拉取，不预加载全部语言。
- `scripts/i18n-check.js`：CI 强制校验三语言文件 key 集合完全一致，任何一个模块缺翻译即 CI 失败（见第 6 节）。

---

## 4. 后端架构

### 4.1 同构 Fetch Handler：兼容四平台的核心设计

Cloudflare Workers、Vercel Edge Functions、Deno（`Deno.serve`）、以及 Node.js（通过 `node:http` + 全局 `Request`/`Response` polyfill 语义，Node 18+ 原生支持）**都以"标准 Web `Request → Response`"为共同语义**。因此后端核心被设计为一个与运行时无关的纯函数：

```js
/**
 * @param {Request} request
 * @param {Env} env            // 平台注入的环境/绑定（D1、KV、环境变量等的统一视图）
 * @returns {Promise<Response>}
 */
export async function handleRequest(request, env) { /* server/app.js 组装的路由表 */ }
```

四个平台各自的入口文件（`server/adapters/*.entry.js`）只做"胶水转换"：把平台原生入口（`fetch(request, env, ctx)` / `Deno.serve` / `http.createServer`）转成对 `handleRequest` 的调用，**业务逻辑 100% 复用，平台差异被收敛到不到 50 行的适配层**。

### 4.2 路由与中间件

- `server/core/router.js`：手写的基于 `URLPattern`/字符串匹配的路由器，按 `method + path` 匹配，支持路径参数。
- `server/core/middleware.js`：洋葱模型中间件链，顺序为 `CORS → 鉴权(x-auth-password) → 限流(简单令牌桶，内存实现) → 业务路由 → 统一错误处理`。
- 各模块后端路由与前端模块一一对应，放在 `server/modules/<id>/routes.js`，业务逻辑放 `service.js`，`server/app.js` 汇总所有模块的 `routes.js` 生成最终路由表——新增后端模块同样"只加文件、不改壳层"。

### 4.3 鉴权系统：`X-Auth-Password`

本项目采用**单密码全局鉴权**（面向个人/小团队自托管场景，非多用户账号体系）。

**存储侧**：管理密码不落库明文，使用 PBKDF2（`crypto.subtle`，加盐、高迭代次数）生成哈希，存于 `app_settings` 表键 `settings:auth:password_hash`（或部署环境变量 `AUTH_PASSWORD_HASH` 覆盖，优先级更高）。

**签发侧**：登录成功后，服务端签发一个**派生令牌**（`HMAC(password_hash_secret, expiresAt + nonce)`），而不是把原始密码在后续每次请求里明文传输；令牌本身携带过期时间戳，服务端校验只需验签 + 判断是否过期，**无需服务端存 session**，天然适配 Cloudflare/Vercel 边缘无状态环境。

**传输侧**：前端后续每个请求都在 `X-Auth-Password` 请求头携带该令牌（`app/lib/fetcher.js` 统一注入）；`server/core/middleware.js` 校验，失败返回 `401`，前端 `app/core/auth.js` 捕获后清空本地凭证并展示统一的密码输入页（前端路由守卫，未鉴权状态下任何路由都会被拦截到密码页，不依赖后端 401 才发现）。

**会话时长选择 UI**（设置 → 安全 子模块）：

```
┌──────┬──────┬──────┬──────┐
│ 4小时 │ 8小时 │ 12小时│ 24小时│   ← 第一行：小时级
├──────┼──────┼──────┼──────┤
│ 7天  │ 14天 │ 30天 │ 90天 │   ← 第二行：天级
└──────┴──────┴──────┴──────┘
┌────────────────────────────┐
│      直到下次浏览器打开        │   ← 跨两列的大按钮
└────────────────────────────┘
```

选中定时选项（小时/天）→ 令牌 + 过期时间戳存 `localStorage`；选中"直到下次浏览器打开"→ 存 `sessionStorage`（浏览器完全关闭即清空，无固定过期时间）。

### 4.4 数据库分层：适配器模式 + 自动选型

**统一接口**（`server/db/adapter.interface.js`，接口契约而非实现）：

```js
/**
 * @typedef {Object} DBAdapter
 * @property {(sql: string, params?: any[]) => Promise<any[]>} query
 * @property {(sql: string, params?: any[]) => Promise<{changes:number, lastInsertRowid?:number|bigint}>} execute
 * @property {(fn:(tx: DBAdapter)=>Promise<void>) => Promise<void>} transaction
 * @property {() => Promise<void>} close
 */
```

**三个实现**：

| 适配器 | 底层能力 | 使用场景 |
|---|---|---|
| `sqlite.adapter.js` | Node ≥ 22 内置 `node:sqlite`（文件型数据库） | 本地开发默认；Docker/VPS 可显式切换 |
| `d1.adapter.js` | Cloudflare 原生绑定 `env.DB.prepare(sql).bind(...).all()` | Cloudflare 部署默认 |
| `turso.adapter.js` | Turso/libSQL 官方 **HTTP(Hrana) 协议**，用 `fetch` 直连 + Bearer Token 鉴权，不引入 `@libsql/client` SDK | Vercel / Deno / Docker 部署默认 |

**自动选型逻辑**（`server/db/resolver.js`）：

```
1. 显式环境变量 DB_DRIVER=sqlite|d1|turso  → 用户显式配置永远优先生效
2. 未显式配置时：
   a. 探测到 Cloudflare 运行时特征（存在 env.DB 绑定）→ d1
   b. NODE_ENV === 'development' 且非生产平台        → sqlite（./data/dev.sqlite）
   c. 其余所有生产部署场景（Vercel / Deno / Docker）    → turso
```

> 说明：Docker/VPS 场景默认也选 Turso，是为了保持"部署产物无本地状态、可随时水平扩展/重建实例"的一致性；若用户明确需要 VPS 本地持久化 SQLite（有持久卷），可用 `DB_DRIVER=sqlite` 显式覆盖。

**跨平台 bundle 约束**：`resolver.js`、`migrate.js` 与 SQLite 适配器不静态导入 `node:*` 模块。只有 Node 运行时实际选择 SQLite 时，才通过 `process.getBuiltinModule()` 获取 `node:sqlite`、文件系统和路径能力；Cloudflare/Deno 的边缘 bundle 因此不会携带 Node SQLite。Cloudflare/Deno 发布前必须由 Wrangler/安全环境显式执行迁移，边缘运行时不扫描本地迁移目录。

**无 ORM，SQL-first**：迁移文件是纯 `.sql`（`server/db/migrations/000x_*.sql`），一个极简迁移 runner 把已执行版本记录在 `app_settings` 的 `settings:migrations:version`；查询语句集中放在各模块的 `server/db/query/*.queries.js`，一律参数化，禁止字符串拼接 SQL。

### 4.5 数据规范

**全局配置**：统一存放在 `app_settings` 键值表（`key TEXT PRIMARY KEY, value TEXT, updated_at`），key 命名规则为 `domain:subject[:field]`：

| Key | 含义 |
|---|---|
| `settings:profile` | 用户资料（加密字段见 4.6） |
| `settings:display` | 主题模式（system/light/dark）、语言 |
| `settings:auth:password_hash` | 鉴权密码哈希 |
| `settings:auth:session_default` | 默认会话时长选项 |
| `accounts:webdav` | WebDAV 账号（加密） |
| `accounts:llm:openai` | 大模型 API Key（加密） |

**业务表**：命名为 `[module]_[entity]`，子模块如需独立表则 `[module]_[submodule]_[entity]`：

| 表名 | 归属 |
|---|---|
| `notes_data` / `notes_tags` | notes 模块 |
| `chat_conversations` / `chat_messages` | chat 模块 |
| `notes_tags_bindings` | notes 模块下 tags 子模块 |

### 4.6 敏感数据加密策略

**原则**：可回显使用的敏感信息 → **可逆加密**；只需校验、无需回显的信息 → **不可逆哈希**。

- **哈希（不可逆）**：管理员密码 → PBKDF2 + 随机盐。
- **加密（可逆，AES-256-GCM，`crypto.subtle`）**：
  - 用户信息：邮箱、姓名、性别、年龄、地址、电话、用户名；
  - 凭证类：大模型 API Key、任意第三方 Token（WebDAV/OAuth 等）、若数据库账号密码需要落库（而非纯环境变量）也必须加密。
- **信封加密**：主密钥来自部署环境变量 `ENCRYPTION_KEY`（Cloudflare 用 Secret、Vercel 用 Environment Variable、Deno 用环境变量、Docker 用 `.env`，均不落库）；每条记录随机生成 IV，密文格式统一为 `base64(iv):base64(ciphertext+tag)`，读取时按记录动态解密，不做全表内存明文缓存。

### 4.7 缓存系统设计（三层）

1. **边缘缓存**：只读 `GET` 接口使用 Cache API（Cloudflare/Deno 原生支持）+ `Cache-Control: max-age=..., stale-while-revalidate=...`；
2. **进程内存 LRU**：手写 Map + 双向链表实现的 LRU（`server/core/cache.js`），用于缓存 D1/Turso 高延迟查询结果，TTL 可按查询类型配置；
3. **设置快照**：启动时一次性把 `app_settings` 全量加载进内存 Map，写操作"内存 + DB 双写"，避免每次读配置都打库。

### 4.8 性能与体积预算

| 指标 | 预算 |
|---|---|
| 首屏 JS（gzip） | ≤ 40KB（仅 app-shell + core） |
| 单模块增量 chunk（gzip） | ≤ 15KB |
| 首屏关键 CSS（tokens + shell，gzip） | ≤ 8KB |
| 冷启动首字节（边缘部署） | ≤ 150ms（不含跨区域 DB 往返） |

`scripts/bundle-budget-check.js` 在 CI 中静态统计产物体积并与阈值比对，超出即失败（见第 6 节）。核心手段：模块懒加载（3.2 节）、无框架运行时开销、无 ORM、手写最小工具类而非全量样式库。

---

## 5. 部署矩阵

| 平台 | 入口文件 | Fetch 语义 | 默认数据库 | 静态资源 |
|---|---|---|---|---|
| Cloudflare Pages/Workers | `server/adapters/cloudflare.entry.js` | `export default { fetch(req, env, ctx) }` | D1（可切 Turso） | Pages 静态托管 / Workers Assets（`dist/`） |
| Vercel | `server/adapters/vercel.entry.js` | Edge Function `export default function(req)` | Turso | `public/` 静态托管 |
| Deno Deploy | `server/adapters/deno.entry.js` | `Deno.serve(handler)` | Turso | Deno 内置静态文件服务 |
| Docker/VPS | `server/adapters/node.entry.js` | `node:http` → 标准 Request/Response | Turso（可显式切本地 SQLite） | 容器内置极简静态中间件 |

---

## 6. 构建 & 自动化

### justfile 命令面（文档速览，脚本本身见仓库 `justfile`）

| 分组 | 命令 | 作用 |
|---|---|---|
| 开发 | `just dev` | 本地开发服务器（Node 适配器 + SQLite，原生 ESM 不打包） |
| 数据库 | `just db:migrate` / `db:reset` / `db:seed` | 迁移 / 重建 / 演示数据 |
| 校验 | `just lint` | 手写规则脚本（禁用模式扫描 + `node --check` 语法检查） |
| | `just i18n:check` | 三语言 key 一致性校验 |
| | `just test` | `node --test` |
| | `just deps:check` | 校验 `package.json` 无第三方依赖 |
| 构建 | `just build` | 产物指纹化 + 极简压缩（无打包器） |
| | `just build:budget` | 体积预算校验 |
| 部署 | `just deploy:cloudflare` / `deploy:vercel` / `deploy:deno` / `deploy:docker` | 分别包装对应平台官方 CLI |

### GitHub Actions 流水线（分文件，文档速览）

- `ci.yml`：push/PR 触发，串联 `deps:check → lint → test → i18n:check → build:budget`；
- `deploy-cloudflare.yml` / `deploy-vercel.yml` / `deploy-deno.yml`：推送 `v*` tag 或 Actions 手动指定 `ref` 时，分别执行源码校验、构建和对应平台部署；
- `docker-publish.yml`：推送 `v*` tag 或手动指定 `ref` 时构建镜像并推送到 GHCR，供 VPS 端 `docker pull` + `docker run` 拉取更新。

---

## 7. 测试策略

- 单元测试与源码同目录（`xxx.test.js` 紧邻 `xxx.js`），符合"模块内聚"原则，用 `node --test` 统一执行；
- DB 相关测试使用内存 SQLite（`:memory:`），不依赖外部服务；
- 端到端测试放 `tests/e2e/`，针对已启动的本地开发服务器跑关键用户路径（鉴权、模块加载、暗黑模式切换）。

---

## 8. Git 提交规范与代码评审

基于 [Conventional Commits](https://www.conventionalcommits.org/)，**强制要求正文逐文件说明改动，精确到方法/组件级别**：

```
<type>(<scope>): <简短描述>

- <文件路径1>: <改动说明，含新增/修改的方法或组件名>
- <文件路径2>: <改动说明>
- ...

[可选 Footer：Refs / BREAKING CHANGE]
```

**示例**：

```
feat(notes): 新增标签多选筛选功能

- app/modules/notes/components/notes-tag-filter.js: 新增 <notes-tag-filter>
  组件，实现标签多选与 URL 查询参数同步（新增 connectedCallback / handleChange 方法）
- app/modules/notes/store.js: 新增 selectedTags 状态字段与 setSelectedTags() action
- server/modules/notes/service.js: listNotes() 增加 tags 过滤参数
- server/db/query/notes.queries.js: 新增 SELECT_NOTES_BY_TAGS 查询常量（参数化）
- app/modules/notes/locales/{zh-CN,zh-TW,en}.json: 新增 filter.byTags 文案

Refs: #123
```

`type` 取值遵循标准集合：`feat` `fix` `refactor` `perf` `style` `docs` `test` `build` `ci` `chore`。评审清单见 `AGENTS.md` 第 11 节。

---

## 9. 架构决策记录（ADR 摘要）

| ADR | 决策 | 理由 |
|---|---|---|
| ADR-001 | 不用任何前端框架，改用原生 Web Components | 满足"零第三方包"硬约束，Shadow DOM 天然提供组件级样式隔离，契合"模块解耦"要求 |
| ADR-002 | 不打包，走原生 ESM + 懒加载 | 避免引入打包器依赖；懒加载天然按模块拆分产物，直接服务于体积预算 |
| ADR-003 | 后端统一为 `Request → Response` 纯函数 | 是四平台（Workers/Edge/Deno/Node）唯一的公共语义，业务代码零改动跨平台 |
| ADR-004 | DB 用适配器模式而非 ORM | ORM 引入依赖且在边缘环境体积/冷启动代价高；SQL-first 更可控、可预测性能 |
| ADR-005 | 鉴权用单密码 + 无状态派生令牌 | 匹配个人自托管场景，无需 session 存储，天然适配边缘无状态运行时 |

新增架构级决策请在 `docs/decisions/` 下新建 `ADR-00N-xxx.md`，并在本表追加一行。

---

## 10. 附录：接口契约速查

- `ModuleManifest`：见 3.2 节
- `DBAdapter`：见 4.4 节
- `X-Auth-Password` 令牌校验流程：见 4.3 节
- `app_settings` key 命名规则：见 4.5 节
