/**
 * server/app.js
 * 同构后端组装（运行时无关，ARCHITECTURE.md 4.1 节：纯 Request → Response）：
 *   1. resolveDb 自动选型（sqlite / d1 / turso）
 *   2. ensureMigrated 幂等迁移
 *   3. 加载 app_settings 内存快照（缓存第 3 层）
 *   4. 汇总各模块路由（只加文件、不改壳层：新增模块在此补一行 registerXxxRoutes）
 *   5. 包装中间件管道（CORS → 限流 → 鉴权 → 路由 → 错误处理）
 */

import { createRouter } from './core/router.js';
import { createHandler } from './core/middleware.js';
import { resolveDb } from './db/resolver.js';
import { ensureMigrated } from './db/migrate.js';
import { createSettingsSnapshot } from './core/context.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerSettingsRoutes } from './modules/settings/routes.js';
import { registerNotesRoutes } from './modules/notes/routes.js';
import { registerChatRoutes } from './modules/chat/routes.js';

/**
 * 创建完整应用（幂等：同一 env 对象在进程内只初始化一次，见 handleRequest 的缓存）。
 * @param {Record<string, any>} env 平台注入环境（含 DB 绑定 / 环境变量）
 */
export async function createApp(env = {}) {
  const { driver, db } = resolveDb(env);
  await ensureMigrated(db);
  const settings = await createSettingsSnapshot(db);

  const app = { env, db, driver, settings };

  const router = createRouter();
  registerAuthRoutes(router, app);
  registerSettingsRoutes(router, app);
  registerNotesRoutes(router, app);
  registerChatRoutes(router, app);

  const handleRequest = createHandler({ router, app });
  return { ...app, router, handleRequest };
}

const _apps = new WeakMap();

/**
 * 同一 env 对象 → 进程内唯一的 app 实例（DB 连接 / 迁移 / 设置快照只初始化一次）。
 * 注意：直接调 createApp() 会绕过缓存（每次新建，供脚本/测试隔离使用）。
 */
export function getOrCreateApp(env = {}) {
  let appPromise = _apps.get(env);
  if (!appPromise) {
    appPromise = createApp(env).catch((err) => {
      _apps.delete(env);
      throw err;
    });
    _apps.set(env, appPromise);
  }
  return appPromise;
}

/**
 * 平台统一入口：Request → Response。
 * 各适配器（server/adapters/*.entry.js）只做"胶水转换"，业务 100% 复用本函数。
 */
export async function handleRequest(request, env = {}) {
  const app = await getOrCreateApp(env);
  return app.handleRequest(request);
}