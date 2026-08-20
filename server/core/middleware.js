/**
 * server/core/middleware.js
 * 洋葱模型统一管道（ARCHITECTURE.md 4.2 节）：
 *   CORS → 鉴权（X-Auth-Password） → 限流（内存令牌桶） → 业务路由 → 统一错误处理
 * 路由 handler 约定：返回 Response，或返回对象（自动 JSON 200）。
 * 需要鉴权的路由默认经 X-Auth-Password 校验；公开路由由路由注册时显式标注。
 */

import { AUTH_HEADER, SETTING_KEYS } from '../../shared/constants.js';
import { verifyToken } from './auth.js';
import { LRUCache } from './cache.js';

/** 业务可抛出的带状态码错误（路由/service 层使用） */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code 机器可读错误码（前端 toast 判断）
   */
  constructor(status, code) {
    super(code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function jsonError(status, code) {
  return json({ error: code }, status);
}

/** 固定窗口限流器（内存实现，节点内有效） */
function createRateLimiter({ limit = 200, windowMs = 60_000 } = {}) {
  const buckets = new Map();
  return {
    /** @returns {{ ok: boolean, retryAfter: number }} */
    check(key) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfter: 0 };
      }
      bucket.count += 1;
      if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
      if (buckets.size > 10_000) buckets.clear(); // 简单防膨胀
      return { ok: true, retryAfter: 0 };
    },
  };
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, x-auth-password',
  'access-control-max-age': '86400',
  vary: 'origin',
};

const DEFAULT_CACHE = 'no-store';

/**
 * 组装最终 Request → Response 处理器。
 * @param {{ router: object, app: object }} deps router=server/core/router 实例；app={env, settings, db, driver}
 */
export function createHandler({ router, app }) {
  const limiter = createRateLimiter();

  return async function handleRequest(request) {
    try {
      // 1) CORS 预检
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      const url = new URL(request.url);
      const match = router.match(request.method, url.pathname);
      if (!match) return jsonError(404, 'NOT_FOUND');

      // 2) 鉴权（公开路由显式跳过，见各模块 routes.js 的 public 标注）
      if (!match.isPublic) {
        const token = request.headers.get(AUTH_HEADER);
        const secret = await resolveAuthSecret(app);
        if (!token || !secret) return jsonError(401, 'UNAUTHORIZED');
        const result = await verifyToken(token, secret);
        if (!result.ok) return jsonError(401, 'UNAUTHORIZED');
      }

      // 3) 限流（按客户端 IP，简单令牌桶/固定窗口，内存实现）
      const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
      const rl = limiter.check(ip);
      if (!rl.ok) {
        return json({ error: 'RATE_LIMITED' }, 429, { 'retry-after': String(rl.retryAfter) });
      }

      // 4) 业务路由
      const ctx = { request, url, env: app.env, params: match.params, query: url.searchParams, app };
      const result = await match.handler(ctx);

      const headers = { ...CORS_HEADERS, ...(match.cacheControl ? { 'cache-control': match.cacheControl } : { 'cache-control': DEFAULT_CACHE }) };
      if (result instanceof Response) {
        const merged = new Response(result.body, { status: result.status, headers: { ...headers, ...Object.fromEntries(result.headers) } });
        return merged;
      }
      return json(result, 200, headers);
    } catch (err) {
      // 5) 统一错误处理
      if (err instanceof HttpError) {
        return json({ error: err.code, ...(err.details ? { details: err.details } : {}) }, err.status);
      }
      console.error('[server] unhandled error:', err);
      return jsonError(500, 'INTERNAL');
    }
  };
}

/** 鉴权密钥：环境变量 AUTH_PASSWORD_HASH 优先，否则取设置快照 */
export async function resolveAuthSecret(app) {
  if (app.env.AUTH_PASSWORD_HASH) return app.env.AUTH_PASSWORD_HASH;
  return app.settings.get(SETTING_KEYS.PASSWORD_HASH, null);
}

/** 读取 JSON 请求体（带大小上限） */
export async function readJson(request, { maxBytes = 1_000_000 } = {}) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'BAD_JSON');
  }
}

/** 只读整型查询参数（带默认值） */
export function intParam(value, fallback, { min = 0, max = 10_000 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}