# Cloudflare Workers + D1 部署

本项目在 Cloudflare 的后端入口是 `server/adapters/cloudflare.entry.js`，D1 绑定名固定为 `DB`，数据库名与 `wrangler.toml` 中的 `database_name` 保持一致（当前为 `freebuff-nova`）。前端生产静态文件由 `node scripts/build.js` 生成到 `dist/`。

> **先确认静态资源部署方式**：当前入口文件只把 `/api/*` 转给后端，其它路径返回 404；`wrangler.toml` 目前没有启用 Workers Assets。若使用单个 Worker 域名同时承载前端和 API，需要在 Cloudflare 中配置 Pages 静态资源/Functions，或先补充 Assets 转发配置。不要在未配置静态资源的情况下直接把它当成完整的单 Worker SPA 发布。

## 1. 部署前准备

需要：

- Cloudflare 账号和 Account ID；
- Wrangler（通过 `npx` 临时调用，不写入项目依赖）；
- 一个 D1 数据库；
- `ENCRYPTION_KEY` Secret；
- 可选的 `AUTH_PASSWORD_HASH` Secret；
- 生产环境的 `database_id`。

安全要求：

- `database_id` 不是密码，可以写入 `wrangler.toml`；
- API Token、`ENCRYPTION_KEY`、`AUTH_PASSWORD_HASH` 不得写入仓库；
- 不要把原始管理密码写进环境变量，项目只接受 PBKDF2 哈希或首次访问时在密码页设置密码；
- 生产环境必须配置 `ENCRYPTION_KEY`，否则用户资料等敏感字段无法加密。

## 2. 检查并配置 `wrangler.toml`

当前配置的关键部分应类似：

```toml
name = "freebuff-nova"
main = "server/adapters/cloudflare.entry.js"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "freebuff-nova"
database_id = "替换为真实的 database_id"
migrations_dir = "server/db/migrations"
```

迁移文件实际位于 `server/db/migrations/`，当前仓库的 `wrangler.toml` 已通过 `migrations_dir` 注册该目录。执行 Wrangler migration 前仍需把 `database_id` 替换为真实的 D1 数据库 ID。

另外，Cloudflare Workers/Pages 对静态文件的托管方式不同：

- **Pages Git 集成**：构建输出目录设置为 `dist`，并确保 `/api/*` 由 Pages Functions/Worker 入口转发到 `server/adapters/cloudflare.entry.js`；
- **独立 Workers**：需要启用 Assets 并让非 `/api/*` 请求转发给 Assets。仅设置 `main` 而不配置 Assets 时，前端路径会返回 404。

## 3. Cloudflare Dashboard 导入 Git 仓库

不同账户的菜单名称可能略有差异，推荐在 **Workers & Pages** 中使用 Git 集成：

1. 打开 **Workers & Pages** → **Create application**。
2. 选择从 Git 仓库导入，授权并选择本仓库及目标分支。
3. 构建配置使用：
   - Framework preset：Other / None；
   - Build command：`node scripts/build.js`；
   - Static output directory：`dist`；
   - Node.js：22 或项目要求的兼容版本。
4. 在 Worker/Pages Functions 的 Settings → Variables and Secrets 添加：
   - `ENCRYPTION_KEY`，类型选择 Secret；
   - `AUTH_PASSWORD_HASH`，可选，类型选择 Secret。
5. 确认 D1 绑定名称为 `DB`，并指向 `wrangler.toml` 中的数据库。
6. 首次发布前完成一次远程 D1 migration（见下一节）。
7. 发布后确认前端静态资源和 `/api/auth/status` 都由同一域名提供。

如果 Dashboard 无法识别 `server/adapters/cloudflare.entry.js` 或 `wrangler.toml`，不要在控制台另建一套不同的 API 入口；改用 CLI/GitHub Actions，并先完成静态资源映射配置。

## 4. CLI 部署

登录并创建 D1：

```bash
npx wrangler@latest login
npx wrangler@latest d1 create freebuff-nova
```

把命令返回的 `database_id` 写入 `wrangler.toml`，然后构建并执行迁移：

```bash
node scripts/build.js
npx wrangler@latest d1 migrations list freebuff-nova --remote --config wrangler.toml
npx wrangler@latest d1 migrations apply freebuff-nova --remote --config wrangler.toml
npx wrangler@latest deploy --config wrangler.toml
```

设置 Secret：

```bash
printf '%s' "$ENCRYPTION_KEY" | npx wrangler@latest secret put ENCRYPTION_KEY --config wrangler.toml
printf '%s' "$AUTH_PASSWORD_HASH" | npx wrangler@latest secret put AUTH_PASSWORD_HASH --config wrangler.toml
```

变量值应来自本地安全环境或 CI Secret；不要把命令输出、Token 或密钥提交到仓库。

## 5. 数据库迁移

迁移文件是 `server/db/migrations/*.sql`，版本只增不改。发布迁移前检查：

```bash
npx wrangler@latest d1 migrations list freebuff-nova --remote --config wrangler.toml
npx wrangler@latest d1 migrations apply freebuff-nova --remote --config wrangler.toml
```

应用启动时也会执行兼容性迁移检查，但生产发布前仍建议显式完成 D1 migration。新增数据库变更必须创建下一个序号的迁移文件，禁止修改已经发布的 SQL。

## 6. GitHub Actions

仓库的 `.github/workflows/deploy-cloudflare.yml` 支持两种触发方式：

- 推送 `v*` tag，例如 `v1.0.0`；
- Actions 页面手动运行，并通过 `ref` 输入指定要部署的分支、tag 或 commit（默认 `main`）。

Workflow 会按顺序执行源码检查、Node 22 构建、远程 D1 migration 和 Wrangler deploy。首次发布前仍需创建 D1 数据库、把真实 `database_id` 写入 `wrangler.toml`，并确保 `migrations_dir` 指向 `server/db/migrations`。

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Wrangler 发布和 D1 migration 权限 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

Token 只通过 GitHub Actions Secret 注入，不要写入 workflow、`wrangler.toml` 或日志。D1 数据库创建不由 workflow 自动完成。

## 7. 验证

项目当前没有 `/api/health` 路由，请使用公开的鉴权状态接口：

```bash
curl -i https://<your-domain>/api/auth/status
```

应返回 HTTP `200` 和类似 JSON：

```json
{"needsSetup":true}
```

然后：

1. 打开前端页面；
2. 首次访问时设置管理密码，或使用预置的 `AUTH_PASSWORD_HASH` 登录；
3. 创建一条笔记和一个标签；
4. 刷新页面并确认数据仍在 D1；
5. 在设置 → 数据库中确认 `driver` 为 `d1`。

## 8. 自定义域名、回滚与常见问题

在 Worker/Pages → Settings → Domains & Routes 中绑定自定义域名。回滚时：

1. 查看 Deployments/Workers 日志；
2. 确认失败版本是否已经执行了数据库 migration；
3. 回滚到上一版本；
4. 不要删除 D1 数据库，也不要通过破坏性 SQL 回滚已经发布的迁移。

常见问题：

- `D1 binding not available`：检查绑定名称是否严格为 `DB`，以及部署入口是否收到 D1 环境。
- `D1 database not found`：检查 `database_id`、数据库名和 Account ID。
- `ENCRYPTION_KEY is required`：在 Secret 中配置，不能只写在 `[vars]` 或提交到仓库。
- 前端路径 404：检查 Pages 静态输出是否为 `dist`，以及 Worker/Pages 是否配置了非 `/api/*` 的静态资源处理。
- Wrangler 找不到迁移：确认 `migrations_dir = "server/db/migrations"` 已配置，并使用与当前 Wrangler 版本匹配的 migration 命令。
- `node:*` 模块兼容性错误：当前业务核心会静态加载 Node SQLite/文件系统适配器；若 Workers 构建器报告 Node 内置模块错误，应先完成针对 Workers 的适配重构，不要仅靠切换 `DB_DRIVER` 绕过静态导入。
