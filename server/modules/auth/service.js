/**
 * server/modules/auth/service.js
 * 鉴权业务逻辑（无 SQL、无加解密以外的敏感逻辑，纯 service 层）：
 *  - 首次运行（无密码哈希）→ 以登录密码初始化（≥8 位）
 *  - 校验密码（PBKDF2）→ 签发无状态派生令牌（HMAC，携带过期时间）
 *  - 存储侧：app_settings 键 settings:auth:password_hash；环境变量 AUTH_PASSWORD_HASH 优先
 */

import { hashPassword, verifyPassword, signToken } from '../../core/auth.js';
import { HttpError } from '../../core/middleware.js';
import { SETTING_KEYS, SESSION_DURATIONS, durationToMs } from '../../../shared/constants.js';

const MIN_PASSWORD_LENGTH = 8;

/** 当前生效的密码哈希（环境变量 > app_settings 快照） */
export async function getPasswordHash(app) {
  if (app.env.AUTH_PASSWORD_HASH) return app.env.AUTH_PASSWORD_HASH;
  return app.settings.get(SETTING_KEYS.PASSWORD_HASH, null);
}

/** 公开状态探测：是否需要初始化密码（仅返回布尔） */
export async function status(app) {
  return { needsSetup: !(await getPasswordHash(app)) };
}

/**
 * 登录（或首启初始化）：
 * @returns {Promise<{ token: string, expiresAt: string|null }>} session 时长无固定过期 → null
 */
export async function login(app, { password, duration = '8h' }) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new HttpError(400, 'BAD_REQUEST');
  }

  let hash = await getPasswordHash(app);
  if (!hash) {
    // 首次运行：以输入密码建立凭证
    if (password.length < MIN_PASSWORD_LENGTH) throw new HttpError(400, 'WEAK_PASSWORD');
    hash = await hashPassword(password);
    await app.settings.set(SETTING_KEYS.PASSWORD_HASH, hash);
  } else {
    const ok = await verifyPassword(password, hash);
    if (!ok) throw new HttpError(401, 'auth.failed');
  }

  const selected = SESSION_DURATIONS.find((d) => d.id === duration) || SESSION_DURATIONS[1];
  const ms = durationToMs(selected.id);
  const expiresAt = ms ? new Date(Date.now() + ms) : null;

  // 无状态派生令牌：HMAC(password_hash, expiresAt + nonce)；'session' 用远期时间戳（无固定过期）
  const token = await signToken(hash, expiresAt || new Date(Date.now() + 365 * 24 * 3600 * 1000));

  await app.settings.set(SETTING_KEYS.SESSION_DEFAULT, selected.id);

  return { token, expiresAt: expiresAt ? expiresAt.toISOString() : null, duration: selected.id };
}