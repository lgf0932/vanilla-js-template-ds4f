/**
 * server/db/adapter.interface.js
 * DBAdapter 统一接口契约（类型说明，非实现，ARCHITECTURE.md 4.4 节）：
 *
 * @typedef {Object} DBAdapter
 * @property {(sql: string, params?: any[]) => Promise<any[]>} query
 *        查询：单条 SQL（可含 ? 占位符），返回行数组（行内字段名 snake/camel 由查询常量决定）
 * @property {(sql: string, params?: any[]) => Promise<{changes:number, lastInsertRowid?: number|bigint}>} execute
 *        写入：返回变更行数与自增 id
 * @property {(sql: string) => Promise<void>} exec
 *        执行多语句 SQL 块（仅迁移运行器使用；迁移文件为仓库自有内容，无用户输入）
 * @property {(fn: (tx: DBAdapter) => Promise<any>) => Promise<any>} transaction
 *        事务包装（子查询仍走本接口的 query/execute）
 * @property {() => Promise<void>} close
 *
 * 三个实现见 adapters/：sqlite.adapter.js（node:sqlite）、d1.adapter.js（Cloudflare 绑定）、
 * turso.adapter.js（HTTP(Hrana) 直连 fetch，无 SDK）。
 */

export const ADAPTER_INTERFACE_VERSION = '1.0';