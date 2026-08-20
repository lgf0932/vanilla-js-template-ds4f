/**
 * server/modules/settings/service.js
 * 设置业务逻辑：profile（AES-GCM 加密落库）/ display / 安全 / 数据库信息。
 * 敏感字段（用户信息）读写一律经 server/core/crypto.js 封装，禁止绕过（AGENTS 红线 #8）。
 */

import { SETTING_KEYS, PROFILE_FIELDS, LANGUAGE_CODES, SESSION_DURATIONS } from '../../../shared/constants.js';
import { schemas, validate } from '../../../shared/validation.js';
import { HttpError } from '../../core/middleware.js';
import { encryptText, decryptText, getEncryptionKey, hasEncryptionKey } from '../../core/crypto.js';
import { hashPassword, verifyPassword } from '../../core/auth.js';
import {
  COUNT_NOTES,
  COUNT_TAGS,
  COUNT_CONVERSATIONS,
  COUNT_MESSAGES,
} from '../../db/query/settings.queries.js';

const THEME_MODES = ['system', 'light', 'dark'];

function emptyProfile() {
  return Object.fromEntries(PROFILE_FIELDS.map((f) => [f, '']));
}

/** 读取用户资料：解密 settings:profile（明文只在响应时存在，不落缓存） */
export async function getProfile(app) {
  const payload = app.settings.get(SETTING_KEYS.PROFILE, null);
  if (!payload) return { profile: emptyProfile() };
  try {
    const secret = getEncryptionKey(app.env);
    const plain = await decryptText(secret, payload);
    const parsed = JSON.parse(plain);
    return { profile: { ...emptyProfile(), ...parsed } };
  } catch {
    // 密钥轮换或数据损坏：按空资料处理（不炸掉整个设置页）
    return { profile: emptyProfile() };
  }
}

/** 保存用户资料：仅收录 PROFILE_FIELDS，校验后整体加密落库 */
export async function updateProfile(app, profile = {}) {
  const clean = {};
  for (const field of PROFILE_FIELDS) clean[field] = String(profile[field] ?? '');
  const errors = validate(clean, schemas.profile);
  if (Object.keys(errors).length) {
    const err = new HttpError(400, 'VALIDATION');
    err.details = errors;
    throw err;
  }
  const secret = getEncryptionKey(app.env);
  const ciphertext = await encryptText(secret, JSON.stringify(clean));
  await app.settings.set(SETTING_KEYS.PROFILE, ciphertext);
  return { ok: true };
}

/** 显示设置：主题 + 语言 */
export async function getDisplay(app) {
  const raw = app.settings.get(SETTING_KEYS.DISPLAY, null);
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }
  return {
    theme: THEME_MODES.includes(parsed.theme) ? parsed.theme : 'system',
    language: LANGUAGE_CODES.includes(parsed.language) ? parsed.language : 'zh-CN',
  };
}

export async function updateDisplay(app, { theme, language } = {}) {
  if (theme !== undefined && !THEME_MODES.includes(theme)) throw new HttpError(400, 'VALIDATION');
  if (language !== undefined && !LANGUAGE_CODES.includes(language)) throw new HttpError(400, 'VALIDATION');
  const current = await getDisplay(app);
  const next = {
    theme: theme ?? current.theme,
    language: language ?? current.language,
  };
  await app.settings.set(SETTING_KEYS.DISPLAY, JSON.stringify(next));
  return next;
}

/** 修改密码：校验旧密码 → 新密码 PBKDF2 重哈希。注意：令牌以密码哈希为密钥，改密后需重新登录。 */
export async function changePassword(app, { currentPassword, newPassword } = {}) {
  const hash = app.settings.get(SETTING_KEYS.PASSWORD_HASH, null);
  if (app.env.AUTH_PASSWORD_HASH) {
    throw new HttpError(400, 'ENV_HASH_IMMUTABLE'); // 哈希来自环境变量时不允许页面修改
  }
  if (!hash) throw new HttpError(400, 'NOT_SETUP');
  if (typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, hash))) {
    throw new HttpError(401, 'WRONG_PASSWORD');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new HttpError(400, 'WEAK_PASSWORD');
  }
  await app.settings.set(SETTING_KEYS.PASSWORD_HASH, await hashPassword(newPassword));
  return { ok: true };
}

/** 默认会话时长 */
export async function getSessionDefault(app) {
  const raw = app.settings.get(SETTING_KEYS.SESSION_DEFAULT, '8h');
  const duration = SESSION_DURATIONS.some((d) => d.id === raw) ? raw : '8h';
  return { duration };
}

export async function updateSessionDefault(app, { duration } = {}) {
  if (!SESSION_DURATIONS.some((d) => d.id === duration)) throw new HttpError(400, 'VALIDATION');
  await app.settings.set(SETTING_KEYS.SESSION_DEFAULT, duration);
  return { duration };
}

/** 只读数据库信息（设置 → 数据库 子模块展示） */
export async function databaseInfo(app) {
  const [notes, tags, conversations, messages] = await Promise.all([
    app.db.query(COUNT_NOTES),
    app.db.query(COUNT_TAGS),
    app.db.query(COUNT_CONVERSATIONS),
    app.db.query(COUNT_MESSAGES),
  ]);
  const version = app.settings.get(SETTING_KEYS.MIGRATIONS_VERSION, '[]');
  let migrationsVersion = 0;
  try {
    migrationsVersion = JSON.parse(version || '[]').length;
  } catch {
    migrationsVersion = 0;
  }
  return {
    driver: app.driver,
    migrationsVersion,
    encryptionConfigured: hasEncryptionKey(app.env),
    tables: {
      notes: Number(notes[0]?.total ?? 0),
      tags: Number(tags[0]?.total ?? 0),
      conversations: Number(conversations[0]?.total ?? 0),
      messages: Number(messages[0]?.total ?? 0),
    },
  };
}