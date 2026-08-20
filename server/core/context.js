/**
 * server/core/context.js
 * 设置快照（ARCHITECTURE.md 4.7 节第 3 层缓存）：
 * 启动时一次性把 app_settings 全量加载进内存 Map；写操作"内存 + DB 双写"，
 * 避免每次读配置都打库。
 */

import { SELECT_SETTINGS_ALL, UPSERT_SETTING } from '../db/query/settings.queries.js';

/**
 * @param {object} db DBAdapter
 * @returns {Promise<{ get:(key:string, fallback?:any)=>any, has:(key:string)=>boolean, set:(key:string, value:string)=>Promise<void>, raw: Map<string,string> }>}
 */
export async function createSettingsSnapshot(db) {
  const rows = await db.query(SELECT_SETTINGS_ALL);
  const map = new Map();
  for (const row of rows) map.set(String(row.key), String(row.value));

  return {
    raw: map,
    get(key, fallback = null) {
      return map.has(key) ? map.get(key) : fallback;
    },
    has(key) {
      return map.has(key);
    },
    /** 内存 + DB 双写 */
    async set(key, value) {
      map.set(key, String(value));
      await db.execute(UPSERT_SETTING, [key, String(value), new Date().toISOString()]);
    },
  };
}