# ADR-004: DB 用适配器模式而非 ORM

- 状态：已采纳
- 日期：2025-01

## 背景
数据库需要三选一：本地/开发 SQLite（node:sqlite）、Cloudflare D1（原生绑定）、
Turso（HTTP(Hrana) 直连）。同时项目禁止引入 ORM 或查询构建器依赖。

## 决策
- 统一接口 `DBAdapter`（query / execute / exec / transaction / close，见 `server/db/adapter.interface.js`）；
- 三个实现：`sqlite.adapter.js`（node:sqlite）、`d1.adapter.js`（env.DB 绑定）、
  `turso.adapter.js`（fetch 直连 libSQL HTTP 协议，不装 `@libsql/client`）；
- `server/db/resolver.js` 运行时自动选型：显式 `DB_DRIVER` 优先 → Cloudflare 特征 → 开发 sqlite → 生产 turso；
- SQL-first：迁移文件纯 `.sql`，查询集中参数化存放于 `server/db/query/*.queries.js`。

## 理由
- ORM 引入依赖且在边缘环境体积/冷启动代价高；
- SQL-first 更可控、可预测性能，适配器薄层即可覆盖三平台差异。

## 后果
- 新增查询一律写入对应模块的 `*.queries.js`，禁止在 service 里拼接 SQL；
- 迁移文件只增不改（`server/db/migrations/000N_*.sql`），版本记录于 `app_settings`。