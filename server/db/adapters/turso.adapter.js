/**
 * server/db/adapters/turso.adapter.js
 * Turso/libSQL 官方 HTTP(Hrana) 协议直连（fetch + Bearer Token），
 * 不引入 @libsql/client SDK（ARCHITECTURE.md 4.4 节）。
 *
 * 说明：这是最小可用实现——文本型参数映射 + 简单行还原，服务于本项目
 * 已参数化的查询常量；如需扩展类型请在此文件内补充映射，不要绕过适配器写裸请求。
 *
 * @param {{ url: string, token: string }} opts TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
 */
export function createTursoAdapter({ url, token }) {
  if (!url || !token) {
    throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 未配置（使用 Turso 驱动时必须设置）');
  }

  const endpoint = url.replace(/\/+$/, '') + '/v2/pipeline';

  async function pipeline(steps) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ baton: null, requests: steps }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) {
      throw new Error(data?.error?.message || `Turso request failed (${res.status})`);
    }
    return data;
  }

  function argsToHrana(params) {
    return (params || []).map((p) => ({
      type: 'text',
      value: p === null || p === undefined ? '' : String(p),
    }));
  }

  function rowsToObjects(result) {
    const cols = result?.cols || [];
    return (result?.rows || []).map((row) =>
      Object.fromEntries(cols.map((c, i) => [c.name, row[i]?.value ?? null])),
    );
  }

  const adapter = {
    async query(sql, params = []) {
      const data = await pipeline([
        {
          type: 'execute',
          stmt: { sql, args: argsToHrana(params) },
          want_rows: true,
        },
      ]);
      const result = data.results?.[0]?.response?.result;
      if (result?.error) throw new Error(result.error.message);
      return rowsToObjects(result);
    },

    async execute(sql, params = []) {
      const data = await pipeline([
        {
          type: 'execute',
          stmt: { sql, args: argsToHrana(params) },
          want_rows: false,
        },
      ]);
      const result = data.results?.[0]?.response?.result;
      if (result?.error) throw new Error(result.error.message);
      return { changes: Number(result?.affected_row_count ?? 0), lastInsertRowid: result?.last_insert_rowid };
    },

    /** 多语句：Hrana 支持一 pipeline 多条 execute（原子批处理） */
    async exec(sql) {
      const statements = splitStatements(sql);
      if (!statements.length) return;
      const data = await pipeline(
        statements.map((s) => ({
          type: 'execute',
          stmt: { sql: s, args: [] },
          want_rows: false,
        })),
      );
      for (const r of data.results || []) {
        if (r?.response?.result?.error) throw new Error(r.response.result.error.message);
      }
    },

    /** HTTP 无长事务：按顺序执行（弱事务语义，注释说明） */
    async transaction(fn) {
      return fn(adapter);
    },

    close() {
      /* HTTP 直连无需关闭 */
    },
  };

  return adapter;
}

function splitStatements(sql) {
  return String(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}