import { test } from 'node:test';
import assert from 'node:assert/strict';

const moduleUrl = new URL('./offline-api.js', import.meta.url);

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function createFakeIndexedDb() {
  const stores = new Map();

  return {
    open(_name, _version) {
      const request = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };

      queueMicrotask(() => {
        const database = {
          objectStoreNames: {
            contains: (storeName) => stores.has(storeName),
          },
          createObjectStore(storeName) {
            stores.set(storeName, new Map());
            return {};
          },
          transaction(storeName) {
            const store = stores.get(storeName);
            if (!store) throw new Error(`Missing fake store: ${storeName}`);
            const transaction = {
              error: null,
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore() {
                return {
                  get(key) {
                    const valueRequest = {
                      result: undefined,
                      error: null,
                      onsuccess: null,
                      onerror: null,
                    };
                    queueMicrotask(() => {
                      valueRequest.result = clone(store.get(key));
                      valueRequest.onsuccess?.({ target: valueRequest });
                      queueMicrotask(() => transaction.oncomplete?.());
                    });
                    return valueRequest;
                  },
                  put(value, key) {
                    store.set(key, clone(value));
                    queueMicrotask(() => transaction.oncomplete?.());
                  },
                };
              },
            };
            return transaction;
          },
          close() {},
          onversionchange: null,
        };
        request.result = database;
        if (!stores.size) request.onupgradeneeded?.({ target: request });
        request.onsuccess?.({ target: request });
      });

      return request;
    },
  };
}

async function loadApi(label) {
  return import(`${moduleUrl.href}?test=${encodeURIComponent(label)}-${Date.now()}-${Math.random()}`);
}

function withoutIndexedDb() {
  const previous = globalThis.indexedDB;
  delete globalThis.indexedDB;
  return () => {
    if (previous === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previous;
  };
}

test('offlineRequest: IndexedDB 不可用时降级为内存并支持 notes/tags CRUD', async () => {
  const restore = withoutIndexedDb();
  try {
    const { getOfflineStorageInfo, offlineRequest, resetOfflineState } = await loadApi('memory');
    await resetOfflineState();
    const storage = await getOfflineStorageInfo();
    assert.equal(storage.driver, 'memory');
    assert.equal(storage.persistent, false);

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
  } finally {
    restore();
  }
});

test('offlineRequest: IndexedDB 保存快照并在新的数据层实例中恢复', async () => {
  const previous = globalThis.indexedDB;
  globalThis.indexedDB = createFakeIndexedDb();
  try {
    const first = await loadApi('indexeddb-first');
    await first.resetOfflineState();
    assert.deepEqual(await first.getOfflineStorageInfo(), { driver: 'indexeddb', persistent: true });

    const tag = await first.offlineRequest('/api/notes/tags', { method: 'POST', body: { name: '持久化' } });
    await first.offlineRequest('/api/notes', {
      method: 'POST',
      body: { title: '刷新后仍存在', body: 'IndexedDB 快照', tagIds: [tag.id] },
    });
    await first.offlineRequest('/api/settings/profile', {
      method: 'PUT',
      body: { profile: { name: '本地用户' } },
    });

    const second = await loadApi('indexeddb-second');
    assert.deepEqual(await second.getOfflineStorageInfo(), { driver: 'indexeddb', persistent: true });
    const notes = await second.offlineRequest('/api/notes');
    assert.equal(notes.total, 1);
    assert.equal(notes.items[0].title, '刷新后仍存在');
    assert.equal(notes.items[0].tags[0].name, '持久化');
    assert.equal((await second.offlineRequest('/api/settings/profile')).profile.name, '本地用户');

    await second.resetOfflineState();
    assert.equal((await second.offlineRequest('/api/notes')).total, 0);
    assert.equal((await first.offlineRequest('/api/notes')).total, 1);
  } finally {
    if (previous === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previous;
  }
});

test('offlineRequest: chat and settings keep state within the local database contract', async () => {
  const restore = withoutIndexedDb();
  try {
    const { offlineRequest, resetOfflineState } = await loadApi('memory-chat');
    await resetOfflineState();
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
    assert.equal(database.driver, 'memory');
    assert.equal(database.tables.conversations, 1);
  } finally {
    restore();
  }
});

test('resetOfflineState: clears all local entities and restores counters', async () => {
  const restore = withoutIndexedDb();
  try {
    const { offlineRequest, resetOfflineState } = await loadApi('memory-reset');
    await offlineRequest('/api/notes', { method: 'POST', body: { title: '需要清理' } });
    await resetOfflineState();

    assert.equal((await offlineRequest('/api/notes')).total, 0);
    const next = await offlineRequest('/api/notes', { method: 'POST', body: { title: '重新开始' } });
    assert.equal(next.id, 1);
  } finally {
    restore();
  }
});
