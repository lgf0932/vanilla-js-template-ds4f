/**
 * tests/e2e/api.test.js
 * 端到端：直接驱动 server/app.js 的 Request→Response（内存 SQLite，不监听端口），
 * 覆盖关键用户路径：首启建密 → 登录 → 鉴权路由 → 笔记/标签 → 加密资料 → 对话 → 改密。
 */

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, getOrCreateApp } from '../../server/app.js';

const BASE = 'http://nova.test/api';
const testEnv = { DB_DRIVER: 'sqlite', DB_PATH: ':memory:', NODE_ENV: 'test', ENCRYPTION_KEY: 'e2e-envelope-key' };

let token = null;

function call(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { accept: 'application/json' };
  if (auth && token) headers['x-auth-password'] = token;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return handleRequest(new Request(BASE + path, { method, headers, body: payload }), testEnv);
}

async function json(res) {
  return { status: res.status, body: await res.json().catch(() => null) };
}

before(async () => {
  // 预热：迁移 + 建 app（幂等，经缓存入口保证全文件共用同一实例/数据库）
  await getOrCreateApp(testEnv);
});

test('首启：status 需要建密；未鉴权路由 401', async () => {
  const s = await json(await call('/auth/status', { auth: false }));
  assert.equal(s.status, 200);
  assert.equal(s.body.needsSetup, true);

  const denied = await json(await call('/notes'));
  assert.equal(denied.status, 401);
});

test('登录（首启建密）→ 拿到无状态令牌', async () => {
  const res = await json(
    await call('/auth/login', { method: 'POST', auth: false, body: { password: 'admin-pass-123', duration: '8h' } }),
  );
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.expiresAt);
  token = res.body.token;

  const after = await json(await call('/auth/status', { auth: false }));
  assert.equal(after.body.needsSetup, false);

  const wrong = await json(await call('/auth/login', { method: 'POST', auth: false, body: { password: 'wrong', duration: '8h' } }));
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error, 'auth.failed');
});

test('笔记 CRUD + 标签绑定（列表带 tags，参数化过滤）', async () => {
  const tag = await json(await call('/notes/tags', { method: 'POST', body: { name: '工作' } }));
  assert.equal(tag.status, 200);
  const tagId = tag.body.id;

  const note = await json(await call('/notes', { method: 'POST', body: { title: '周报', body: '本周完成 Nova 搭建', tagIds: [tagId] } }));
  assert.equal(note.status, 200);
  assert.equal(note.body.title, '周报');
  assert.deepEqual(note.body.tags.map((x) => x.name), ['工作']);

  const list = await json(await call('/notes?search=周报'));
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].tags[0].name, '工作');

  const byTag = await json(await call(`/notes?tag=${tagId}`));
  assert.equal(byTag.body.total, 1);

  const updated = await json(await call(`/notes/${note.body.id}`, { method: 'PUT', body: { title: '周报 v2', body: '', tagIds: [] } }));
  assert.equal(updated.body.title, '周报 v2');
  assert.deepEqual(updated.body.tags, []);

  const del = await json(await call(`/notes/${note.body.id}`, { method: 'DELETE' }));
  assert.equal(del.status, 200);
  const after = await json(await call('/notes'));
  assert.equal(after.body.total, 0);
});

test('用户资料：AES-GCM 加密落库，读取回显明文', async () => {
  const profile = { username: 'nova', name: '王小明', email: 'xm@example.com', phone: '13800000000', address: '', gender: 'male', age: '28' };
  const put = await json(await call('/settings/profile', { method: 'PUT', body: { profile } }));
  assert.equal(put.status, 200);

  const raw = await queryRaw('settings:profile');
  assert.match(raw, /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/); // iv:ciphertext 格式
  assert.ok(!raw.includes('王小明'), '明文不得落库');

  const got = await json(await call('/settings/profile'));
  assert.deepEqual(got.body.profile, profile);
});

test('聊天：会话 + 消息，列表带计数与最后消息（无 N+1）', async () => {
  const created = await json(await call('/chat/conversations', { method: 'POST', body: { title: '项目讨论' } }));
  const id = created.body.id;

  await call(`/chat/conversations/${id}/messages`, { method: 'POST', body: { role: 'user', content: '你好' } });
  await call(`/chat/conversations/${id}/messages`, { method: 'POST', body: { role: 'assistant', content: '你好，有什么可以帮你？' } });

  const list = await json(await call('/chat/conversations'));
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].messageCount, 2);
  assert.equal(list.body.items[0].lastMessage, '你好，有什么可以帮你？');

  const invalidRole = await json(await call(`/chat/conversations/${id}/messages`, { method: 'POST', body: { role: 'robot', content: 'x' } }));
  assert.equal(invalidRole.status, 400);
});

test('数据库信息：驱动 / 迁移版本 / 表计数 / 加密状态', async () => {
  const info = await json(await call('/settings/database'));
  assert.equal(info.status, 200);
  assert.equal(info.body.driver, 'sqlite');
  assert.equal(info.body.migrationsVersion, 1);
  assert.equal(info.body.encryptionConfigured, true);
  assert.equal(info.body.tables.conversations, 1);
});

test('会话时长默认值读写', async () => {
  const put = await json(await call('/settings/security/session', { method: 'PUT', body: { duration: '30d' } }));
  assert.equal(put.status, 200);
  const got = await json(await call('/settings/security/session'));
  assert.equal(got.body.duration, '30d');
});

test('改密：旧密码校验；改后旧令牌失效、新密码可登录', async () => {
  const wrong = await json(await call('/settings/security/change-password', { method: 'POST', body: { currentPassword: 'nope', newPassword: 'new-pass-456' } }));
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error, 'WRONG_PASSWORD');

  const ok = await json(await call('/settings/security/change-password', { method: 'POST', body: { currentPassword: 'admin-pass-123', newPassword: 'new-pass-456' } }));
  assert.equal(ok.status, 200);

  // 旧令牌（以旧密码哈希为 HMAC 密钥）立即失效
  const stale = await json(await call('/notes'));
  assert.equal(stale.status, 401);

  const relogin = await json(await call('/auth/login', { method: 'POST', auth: false, body: { password: 'new-pass-456', duration: '8h' } }));
  assert.equal(relogin.status, 200);
  token = relogin.body.token;
  const notes2 = await json(await call('/notes'));
  assert.equal(notes2.status, 200);
});

/** 直连同一 app 的底层 db（getOrCreateApp 缓存保证是同一实例/同一数据库） */
async function queryRaw(key) {
  const app = await getOrCreateApp(testEnv);
  const rows = await app.db.query('SELECT value FROM app_settings WHERE key = ?', [key]);
  return rows.length ? rows[0].value : null;
}