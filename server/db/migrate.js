/**
 * server/db/migrate.js
 * 极简迁移运行器：
 *  - 扫描 server/db/migrations/*.sql（按文件名序，000N 严格递增）
 *  - 已执行版本记录在 app_settings 键 `settings:migrations:version`（JSON 数组）
 *  - 每个迁移文件在事务内执行（能力允许的驱动），单个失败即中断
 *  - 迁移文件只增不改（AGENTS 红线 #10），新变更一律新建下一序号文件
 */

import { SELECT_SETTING, UPSERT_SETTING } from './query/settings.queries.js';

/**
 * Node's migration file access is resolved only when available. Edge runtimes
 * apply migrations through their platform CLI before deployment and skip this
 * local filesystem fallback instead of bundling node:fs/node:path/node:url.
 */
function getNodeMigrationContext() {
  const nodeProcess = globalThis.process;
  if (!nodeProcess || typeof nodeProcess.getBuiltinModule !== 'function') return null;

  const fs = nodeProcess.getBuiltinModule('node:fs');
  const path = nodeProcess.getBuiltinModule('node:path');
  const url = nodeProcess.getBuiltinModule('node:url');
  const migrationsDir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'migrations');
  return { fs, path, migrationsDir };
}

async function readApplied(db) {
  let raw = '';
  try {
    // app_settings 由 0001 迁移创建：全新数据库首次运行时会报 no such table，按空处理
    const rows = await db.query(SELECT_SETTING, ['settings:migrations:version']);
    raw = rows.length ? rows[0].value : '';
  } catch {
    raw = '';
  }
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 执行所有未应用的迁移（幂等）。
 * @param {import('./adapter.interface.js').DBAdapter} db
 * @returns {Promise<string[]>} 本次应用的迁移名列表
 */
export async function ensureMigrated(db) {
  const nodeContext = getNodeMigrationContext();
  if (!nodeContext) return [];

  const { fs, path, migrationsDir } = nodeContext;
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = await readApplied(db);
  const newlyApplied = [];

  for (const file of files) {
    const name = file.replace(/\.sql$/, '');
    if (applied.includes(name)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8'); // 仓库自有文件，非用户输入
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.execute(UPSERT_SETTING, ['settings:migrations:version', JSON.stringify([...applied, name]), new Date().toISOString()]);
    });
    applied.push(name);
    newlyApplied.push(name);
  }

  return newlyApplied;
}