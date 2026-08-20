/**
 * server/db/adapters/sqlite.adapter.js
 * 本地/开发默认适配器：Node >= 22 内置 node:sqlite（零依赖）。
 * 路径 ':memory:' 用于测试；文件型自动建目录。
 */

/**
 * Node 22-only builtins are resolved only when the SQLite driver is selected.
 * Keeping these out of static imports lets edge bundlers omit node:sqlite.
 */
function getNodeBuiltin(name) {
  const nodeProcess = globalThis.process;
  if (!nodeProcess || typeof nodeProcess.getBuiltinModule !== 'function') {
    throw new Error('SQLite adapter requires Node.js 22 with process.getBuiltinModule()');
  }
  return nodeProcess.getBuiltinModule(name);
}

/**
 * @param {{ path?: string }} [opts] path=数据库文件路径（默认 ./data/dev.sqlite）
 * @returns {import('../adapter.interface.js').DBAdapter}
 */
export function createSqliteAdapter({ path = './data/dev.sqlite' } = {}) {
  const { DatabaseSync } = getNodeBuiltin('node:sqlite');
  const { mkdirSync } = getNodeBuiltin('node:fs');
  const { dirname, resolve } = getNodeBuiltin('node:path');

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