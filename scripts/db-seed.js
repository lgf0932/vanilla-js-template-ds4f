/**
 * scripts/db-seed.js — 写入演示数据（`just db:seed`）
 * 仅支持本地 SQLite；先迁移再插入，全部参数化。
 */

import { resolveDb } from '../server/db/resolver.js';
import { ensureMigrated } from '../server/db/migrate.js';

const NOW = new Date().toISOString();

async function main() {
  if (resolveDb(process.env).driver !== 'sqlite') {
    throw new Error('db:seed 仅支持本地 SQLite');
  }
  const { db } = resolveDb(process.env);
  await ensureMigrated(db);

  // 标签
  const tags = ['工作', '灵感', '阅读'];
  const tagIds = [];
  for (const name of tags) {
    const res = await db.execute('INSERT INTO notes_tags (name) VALUES (?)', [name]);
    tagIds.push(Number(res.lastInsertRowid));
  }

  // 笔记
  const notes = [
    ['Nova 架构速查', '模块 = 侧边栏一级菜单；子模块 = 二级菜单；跨模块复用上移到 shared/ 或 components/ui。', [0]],
    ['零依赖构建思路', '原生 ESM + Import Map，不打包；模块按路由懒加载，体积预算每模块 ≤ 15KB(gzip)。', [1, 2]],
    ['部署矩阵', 'Cloudflare→D1，Vercel/Deno/Docker→Turso，本地开发→SQLite（node:sqlite）。', [0, 2]],
  ];
  for (const [title, body, tagIdx] of notes) {
    const res = await db.execute('INSERT INTO notes_data (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)', [title, body, NOW, NOW]);
    const noteId = Number(res.lastInsertRowid);
    for (const i of tagIdx) {
      await db.execute('INSERT INTO notes_tags_bindings (note_id, tag_id) VALUES (?, ?)', [noteId, tagIds[i]]);
    }
  }

  // 对话
  const conv = await db.execute('INSERT INTO chat_conversations (title, created_at, updated_at) VALUES (?, ?, ?)', ['项目讨论', NOW, NOW]);
  const convId = Number(conv.lastInsertRowid);
  const messages = [
    ['user', '要不要把设置页的加密字段列一下？'],
    ['assistant', '好主意——用户信息属于敏感字段清单，统一走 AES-GCM 信封加密。'],
    ['user', '那会话时长呢？'],
    ['assistant', "按架构文档 4.3 节：4h~90d 存 localStorage 带过期时间，'直到下次浏览器打开'用 sessionStorage。"],
  ];
  for (const [role, content] of messages) {
    await db.execute(
      'INSERT INTO chat_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)',
      [convId, role, content, NOW],
    );
  }

  console.log(`[db:seed] 完成：${tags.length} 标签 / ${notes.length} 笔记 / 1 对话 / ${messages.length} 消息`);
  await db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[db:seed] 失败:', err.message);
  process.exit(1);
});