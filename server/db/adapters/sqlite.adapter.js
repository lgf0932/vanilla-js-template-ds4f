/**
 * server/db/adapters/sqlite.adapter.js
 * 本地/开发默认适配器：Node >= 22 内置 node:sqlite（零依赖）。
 * 路径 ':memory:' 用于测试；文件型自动建目录。
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * @param {{ path?: string }} [opts] path=数据库文件路径（默认 ./data/dev.sqlite）
 * @returns {import('../adapter.interface.js').DBAdapter}
 */
export function createSqliteAdapter({ path = './data/dev.sqlite' } = {}) {
  if (path !== ':memory:') {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  const adapter = {
    async query(sql, params = []) {
      return db.prepare(sql).all(...params);
    },

    async execute(sql, params = []) {
      const result = db.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowid: result.lastInsertRowid,
      };
    },

    /** 多语句 SQL 块（仅迁移运行器使用） */
    async exec(sql) {
      db.exec(sql);
    },

    async transaction(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn(adapter);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    close() {
      db.close();
    },

    /** 底层句柄（仅供测试/运维工具） */
    raw: db,
  };

  return adapter;
}