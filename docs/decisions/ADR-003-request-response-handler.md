# ADR-003: 后端统一为 `Request → Response` 纯函数

- 状态：已采纳
- 日期：2025-01

## 背景
需要同一份后端代码部署到 Cloudflare Workers / Vercel Edge / Deno / Node(Docker) 四个平台。

## 决策
后端核心是单一同构纯函数：`handleRequest(request, env) => Promise<Response>`
（`server/app.js`）。四个平台各自的入口（`server/adapters/*.entry.js`）只做"胶水转换"，
业务代码 100% 复用，平台差异收敛到不到 50 行的适配层。

## 理由
- `Request → Response` 是四个运行时唯一的公共语义（原生支持或语义等价）；
- 业务代码零改动跨平台，路由、中间件、鉴权、DB 全部与运行时解耦。

## 后果
- 鉴权必须无状态（令牌携带过期时间，服务端不存 session），才能适配边缘无状态运行时；
- 所有平台的配置差异收敛为统一的 `env` 视图（环境变量 / D1 绑定 / Secrets）。