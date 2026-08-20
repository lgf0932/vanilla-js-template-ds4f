/**
 * server/db/query/settings.queries.js
 * 全局配置表 app_settings 的集中查询（SQL 一律参数化，禁止拼接）。
 * app_settings 键值结构：key TEXT PRIMARY KEY, value TEXT, updated_at TEXT。
 */

export const SELECT_SETTINGS_ALL =
  'SELECT key, value, updated_at AS updatedAt FROM app_settings';

export const SELECT_SETTING =
  'SELECT value FROM app_settings WHERE key = ?';

export const UPSERT_SETTING =
  `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`;

/* ---- 业务表计数（settings → database 子模块只读展示） ---- */

export const COUNT_NOTES = 'SELECT COUNT(*) AS total FROM notes_data';
export const COUNT_TAGS = 'SELECT COUNT(*) AS total FROM notes_tags';
export const COUNT_CONVERSATIONS = 'SELECT COUNT(*) AS total FROM chat_conversations';
export const COUNT_MESSAGES = 'SELECT COUNT(*) AS total FROM chat_messages';