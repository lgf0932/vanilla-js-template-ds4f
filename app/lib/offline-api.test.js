import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offlineRequest } from './offline-api.js';

test('offlineRequest: notes and tags support the preview CRUD flow', async () => {
  const tag = await offlineRequest('/api/notes/tags', { method: 'POST', body: { name: '本地' } });
  const note = await offlineRequest('/api/notes', {
    method: 'POST',
    body: { title: '离线笔记', body: '不会写入服务器', tagIds: [tag.id] },
  });

  assert.equal(note.tags[0].name, '本地');
  const filtered = await offlineRequest(`/api/notes?tag=${tag.id}&search=离线`);
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].title, '离线笔记');

  const updated = await offlineRequest(`/api/notes/${note.id}`, {
    method: 'PUT',
    body: { title: '更新后的离线笔记', tagIds: [] },
  });
  assert.equal(updated.title, '更新后的离线笔记');
  assert.deepEqual(updated.tags, []);

  assert.deepEqual(await offlineRequest(`/api/notes/${note.id}`, { method: 'DELETE' }), { ok: true });
  assert.equal((await offlineRequest('/api/notes')).total, 0);
  assert.deepEqual(await offlineRequest(`/api/notes/tags/${tag.id}`, { method: 'DELETE' }), { ok: true });
});

test('offlineRequest: chat and settings keep state within the page', async () => {
  const conversation = await offlineRequest('/api/chat/conversations', {
    method: 'POST',
    body: { title: '本地对话' },
  });
  const message = await offlineRequest(`/api/chat/conversations/${conversation.id}/messages`, {
    method: 'POST',
    body: { role: 'user', content: '你好' },
  });
  assert.equal(message.content, '你好');

  const conversations = await offlineRequest('/api/chat/conversations');
  assert.equal(conversations.items[0].messageCount, 1);
  assert.equal(conversations.items[0].lastMessage, '你好');

  await offlineRequest('/api/settings/profile', {
    method: 'PUT',
    body: { profile: { name: '本地用户' } },
  });
  const profile = await offlineRequest('/api/settings/profile');
  assert.equal(profile.profile.name, '本地用户');

  const display = await offlineRequest('/api/settings/display', {
    method: 'PUT',
    body: { theme: 'dark', language: 'en' },
  });
  assert.deepEqual(display, { theme: 'dark', language: 'en' });

  const database = await offlineRequest('/api/settings/database');
  assert.equal(database.driver, 'offline-preview');
  assert.equal(database.tables.conversations, 1);
});
