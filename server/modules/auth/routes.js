/**
 * server/modules/auth/routes.js
 * 公开路由说明：
 *  - GET /api/auth/status：登录页需要探测"是否需要初始化密码"，只返回布尔，公开合理
 *  - POST /api/auth/login：登录/首启初始化本身必须在鉴权之前可用，公开合理
 * 两者均经过限流中间件（内存令牌桶，见 server/core/middleware.js）。
 */

import { readJson } from '../../core/middleware.js';
import * as authService from './service.js';

export function registerAuthRoutes(router, app) {
  router.add(
    'GET',
    '/api/auth/status',
    async () => authService.status(app),
    { public: true, cacheControl: 'public, max-age=15' },
  );

  router.add(
    'POST',
    '/api/auth/login',
    async (ctx) => {
      const body = await readJson(ctx.request);
      return authService.login(app, {
        password: body.password,
        duration: body.duration,
      });
    },
    { public: true },
  );
}