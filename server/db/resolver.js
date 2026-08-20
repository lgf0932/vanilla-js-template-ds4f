/**
 * server/db/resolver.js
 * 数据库驱动自动选型（ARCHITECTURE.md 4.4 节）：
 *   1. 显式环境变量 DB_DRIVER=sqlite|d1|turso → 用户显式配置永远优先生效
 *   2. 未显式配置时：
 *      a. 探测到 Cloudflare 运行时特征（存在 env.DB 绑定）→ d1
 *      b. NODE_ENV === 'development' 或未设置，且非生产平台 → sqlite（./data/dev.sqlite）
 *      c. 其余所有生产部署场景（Vercel / Deno / Docker）→ turso
 */

import { DB_DRIVERS } from '../../shared/constants.js';
import { createSqliteAdapter } from './adapters/sqlite.adapter.js';
import { createD1Adapter } from './adapters/d1.adapter.js';
import { createTursoAdapter } from './adapters/turso.adapter.js';

/**
 * @param {Record<string, any>} env
 * @returns {{ driver: 'sqlite'|'d1'|'turso', db: import('./adapter.interface.js').DBAdapter }}
 */
export function resolveDb(env = {}) {
  const driver = resolveDriver(env);
  switch (driver) {
    case 'd1': {
      const bindingName = env.D1_BINDING || 'DB';
      return { driver, db: createD1Adapter(env[bindingName]) };
    }
    case 'turso':
      return {
        driver,
        db: createTursoAdapter({
          url: env.TURSO_DATABASE_URL,
          token: env.TURSO_AUTH_TOKEN,
        }),
      };
    case 'sqlite':
    default:
      return { driver, db: createSqliteAdapter({ path: env.DB_PATH || './data/dev.sqlite' }) };
  }
}

/** 纯函数选型（单独导出便于单元测试） */
export function resolveDriver(env = {}) {
  if (env.DB_DRIVER) {
    if (!DB_DRIVERS.includes(env.DB_DRIVER)) {
      throw new Error(`DB_DRIVER 非法取值 "${env.DB_DRIVER}"（可选：${DB_DRIVERS.join(' / ')}）`);
    }
    return env.DB_DRIVER;
  }
  if (env.DB) return 'd1'; // Cloudflare 运行时特征
  // 开发 / 测试环境默认本地 SQLite；未设置 NODE_ENV 视同本地开发
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test' || !env.NODE_ENV) return 'sqlite';
  return 'turso';
}