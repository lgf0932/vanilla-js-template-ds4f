/**
 * server/db/adapters/d1.adapter.js
 * Cloudflare D1 原生绑定适配器（env.DB.prepare(...).bind(...).all/run）。
 * 仅运行于 Workers/Pages Functions 环境。
 *
 * @param {object} binding D1 绑定（默认环境变量 D1_BINDING 指向的绑定）
 */
export function createD1Adapter(binding) {
  if (!binding || typeof binding.prepare !== 'function') {
    throw new Error('D1 binding not available — check wrangler.toml 的 D1_BINDING 配置');
  }

  const adapter = {
    async query(sql, params = []) {
      const result = await binding.prepare(sql).bind(...params).all();
      return result.results ?? [];
    },

    async execute(sql, params = []) {
      const result = await binding.prepare(sql).bind(...params).run();
      const meta = result.meta ?? {};
      return {
        changes: Number(meta.changes ?? 0),
        lastInsertRowid: meta.last_row_id ?? undefined,
      };
    },

    /** D1 无跨语句 exec：按分号拆分逐条 batch 执行（迁移文件为仓库自有内容） */
    async exec(sql) {
      const statements = splitStatements(sql);
      if (!statements.length) return;
      // batch 中任一失败则整体回滚（D1 保证 batch 原子性）
      await binding.batch(statements.map((s) => binding.prepare(s)));
    },

    /** D1 无客户端长事务：按顺序执行（弱事务语义，注释说明） */
    async transaction(fn) {
      return fn(adapter);
    },

    close() {
      /* D1 无需关闭 */
    },
  };

  return adapter;
}

/** 极简 SQL 语句切分（不处理字符串内的分号；仅限仓库自有迁移文件使用） */
function splitStatements(sql) {
  return String(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}