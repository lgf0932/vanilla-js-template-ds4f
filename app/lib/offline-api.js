/**
 * app/lib/offline-api.js
 * 直接双击 index.html 时使用的本地数据层。
 *
 * file:// 模式不能访问 Node SQLite，因此使用浏览器原生 IndexedDB 保存 API 快照；
 * 如果浏览器禁用了 IndexedDB，则自动降级为当前页面内存数据。HTTP 模式仍走真实 API。
 */

const DB_NAME = 'nova-offline-preview';
const DB_VERSION = 2;
const STORE_NAME = 'state';
const META_STORE_NAME = 'meta';
const SNAPSHOT_KEY = 'current';
const PROFILE_KEY = 'profile-key';

function createInitialState() {
  return {
    notes: [],
    tags: [],
    conversations: [],
    messages: new Map(),
    profile: {
      username: '',
      name: '',
      gender: '',
      age: '',
      email: '',
      phone: '',
      address: '',
    },
    display: { theme: 'system', language: 'zh-CN' },
    sessionDuration: '8h',
    counters: { note: 1, tag: 1, conversation: 1, message: 1 },
  };
}

let state = createInitialState();
let storageMode = 'memory';
let hydrated = false;
let databasePromise = null;
let operationQueue = Promise.resolve();

function clone(value) {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function readBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body || {};
}

function timestamp() {
  return new Date().toISOString();
}

function hasIndexedDb() {
  return Boolean(globalThis.indexedDB && typeof globalThis.indexedDB.open === 'function');
}

function openDatabase() {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  try {
    databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
        if (!request.result.objectStoreNames.contains(META_STORE_NAME)) {
          request.result.createObjectStore(META_STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error || new Error('indexeddb.open.failed'));
      request.onblocked = () => reject(new Error('indexeddb.open.blocked'));
    }).catch(() => {
      databasePromise = null;
      return null;
    });
  } catch {
    databasePromise = Promise.resolve(null);
  }
  return databasePromise;
}

function readSnapshot(database) {
  return new Promise((resolve, reject) => {
    let value;
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
    request.onsuccess = () => { value = request.result; };
    transaction.oncomplete = () => resolve(value || null);
    transaction.onerror = () => reject(transaction.error || new Error('indexeddb.read.failed'));
    transaction.onabort = () => reject(transaction.error || new Error('indexeddb.read.aborted'));
  });
}

function writeSnapshot(database, snapshot) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('indexeddb.write.failed'));
    transaction.onabort = () => reject(transaction.error || new Error('indexeddb.write.aborted'));
  });
}

function readMeta(database, key) {
  return new Promise((resolve, reject) => {
    let value;
    const transaction = database.transaction(META_STORE_NAME, 'readonly');
    const request = transaction.objectStore(META_STORE_NAME).get(key);
    request.onsuccess = () => { value = request.result; };
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error || new Error('indexeddb.meta.read.failed'));
    transaction.onabort = () => reject(transaction.error || new Error('indexeddb.meta.read.aborted'));
  });
}

function writeMeta(database, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(META_STORE_NAME, 'readwrite');
    transaction.objectStore(META_STORE_NAME).put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('indexeddb.meta.write.failed'));
    transaction.onabort = () => reject(transaction.error || new Error('indexeddb.meta.write.aborted'));
  });
}

function hasBrowserCrypto() {
  return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
}

async function getProfileKey(database) {
  if (!hasBrowserCrypto()) return null;
  try {
    const existing = await readMeta(database, PROFILE_KEY);
    if (existing) return existing;
    const key = await globalThis.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    await writeMeta(database, PROFILE_KEY, key);
    return key;
  } catch {
    return null;
  }
}

async function encryptProfile(database, profile) {
  if (!Object.values(profile).some(Boolean)) return null;
  const key = await getProfileKey(database);
  if (!key) return null;
  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(profile));
    const ciphertext = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return { iv: [...iv], ciphertext: [...new Uint8Array(ciphertext)] };
  } catch {
    return null;
  }
}

async function decryptProfile(database, payload) {
  if (!payload || !Array.isArray(payload.iv) || !Array.isArray(payload.ciphertext)) return null;
  const key = await getProfileKey(database);
  if (!key) return null;
  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
      key,
      new Uint8Array(payload.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    return null;
  }
}

async function serializeState(database) {
  const profileCiphertext = await encryptProfile(database, state.profile);
  return {
    notes: state.notes,
    tags: state.tags,
    conversations: state.conversations,
    messages: [...state.messages.entries()],
    ...(profileCiphertext ? { profileCiphertext } : {}),
    display: state.display,
    sessionDuration: state.sessionDuration,
    counters: state.counters,
  };
}

function maxId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
}

async function hydrateState(snapshot, database) {
  const initial = createInitialState();
  const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
  const counters = { ...initial.counters, ...(snapshot.counters || {}) };
  const decryptedProfile = await decryptProfile(database, snapshot.profileCiphertext);
  const next = {
    ...initial,
    ...snapshot,
    notes: Array.isArray(snapshot.notes) ? snapshot.notes : initial.notes,
    tags: Array.isArray(snapshot.tags) ? snapshot.tags : initial.tags,
    conversations: Array.isArray(snapshot.conversations) ? snapshot.conversations : initial.conversations,
    messages: new Map(messages.map(([id, items]) => [Number(id), Array.isArray(items) ? items : []])),
    profile: { ...initial.profile, ...(decryptedProfile || snapshot.profile || {}) },
    display: { ...initial.display, ...(snapshot.display || {}) },
    counters,
  };
  next.counters.note = Math.max(Number(next.counters.note) || 1, maxId(next.notes) + 1);
  next.counters.tag = Math.max(Number(next.counters.tag) || 1, maxId(next.tags) + 1);
  next.counters.conversation = Math.max(Number(next.counters.conversation) || 1, maxId(next.conversations) + 1);
  next.counters.message = Math.max(
    Number(next.counters.message) || 1,
    [...next.messages.values()].reduce((max, items) => Math.max(max, maxId(items)), 0) + 1,
  );
  state = next;
}

async function ensureHydrated() {
  if (hydrated) return;
  const database = await openDatabase();
  if (!database) {
    storageMode = 'memory';
    hydrated = true;
    return;
  }

  try {
    const snapshot = await readSnapshot(database);
    storageMode = 'indexeddb';
    if (snapshot) await hydrateState(snapshot, database);
    // 将 v1 的明文 profile 快照升级为 AES-GCM 密文；新快照不会再写入明文 profile。
    if (snapshot?.profile && !snapshot.profileCiphertext) await persistState();
  } catch {
    storageMode = 'memory';
  }
  hydrated = true;
}

async function persistState() {
  if (storageMode !== 'indexeddb') return;
  const database = await openDatabase();
  if (!database) {
    storageMode = 'memory';
    return;
  }
  try {
    await writeSnapshot(database, await serializeState(database));
  } catch {
    // IndexedDB 失败时保留当前页面可用性，后续请求降级为内存模式。
    storageMode = 'memory';
  }
}

function nextId(kind) {
  const id = state.counters[kind];
  state.counters[kind] += 1;
  return id;
}

function noteWithTags(note) {
  return {
    ...note,
    tags: state.tags.filter((tag) => note.tagIds.includes(tag.id)).map(clone),
  };
}

function conversationSummary(conversation) {
  const messages = state.messages.get(conversation.id) || [];
  return {
    ...conversation,
    messageCount: messages.length,
    lastMessage: messages.at(-1)?.content || '',
  };
}

function listNotes(url) {
  const tag = url.searchParams.get('tag') || '';
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const limit = Number(url.searchParams.get('limit') || 20);
  const offset = Number(url.searchParams.get('offset') || 0);
  const filtered = state.notes.filter((note) => {
    const matchesTag = !tag || note.tagIds.includes(Number(tag));
    const matchesSearch = !search || `${note.title} ${note.body}`.toLowerCase().includes(search);
    return matchesTag && matchesSearch;
  });
  return {
    items: filtered.slice(offset, offset + limit).map(noteWithTags).map(clone),
    total: filtered.length,
  };
}

function listTags() {
  return {
    items: state.tags.map((tag) => ({
      ...tag,
      count: state.notes.filter((note) => note.tagIds.includes(tag.id)).length,
    })).map(clone),
  };
}

async function handleRequest(path, options = {}) {
  const method = options.method || 'GET';
  const body = readBody(options.body);
  const url = new URL(path, 'file:///nova-preview/');
  const route = url.pathname;

  // file:// 预览只绕过鉴权；保留公开鉴权接口的响应形状，便于完整前端复用同一 API 契约。
  if (route === '/api/auth/status' && method === 'GET') return { needsSetup: false };
  if (route === '/api/auth/login' && method === 'POST') return { token: null, expiresAt: null, duration: body.duration || '8h' };

  if (route === '/api/notes' && method === 'GET') return listNotes(url);
  if (route === '/api/notes' && method === 'POST') {
    const now = timestamp();
    const note = {
      id: nextId('note'),
      title: String(body.title || '未命名笔记'),
      body: String(body.body || ''),
      tagIds: (body.tagIds || []).map(Number),
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(note);
    return noteWithTags(note);
  }

  const noteMatch = route.match(/^\/api\/notes\/(\d+)$/);
  if (noteMatch) {
    const note = state.notes.find((item) => item.id === Number(noteMatch[1]));
    if (!note) return { error: 'NOT_FOUND' };
    if (method === 'GET') return noteWithTags(note);
    if (method === 'PUT') {
      note.title = String(body.title ?? note.title);
      note.body = String(body.body ?? note.body);
      note.tagIds = (body.tagIds || note.tagIds).map(Number);
      note.updatedAt = timestamp();
      return noteWithTags(note);
    }
    if (method === 'DELETE') {
      state.notes = state.notes.filter((item) => item.id !== note.id);
      return { ok: true };
    }
  }

  if (route === '/api/notes/tags' && method === 'GET') return listTags();
  if (route === '/api/notes/tags' && method === 'POST') {
    const name = String(body.name || '未命名标签').trim();
    const existing = state.tags.find((tag) => tag.name === name);
    if (existing) return clone(existing);
    const tag = { id: nextId('tag'), name, createdAt: timestamp() };
    state.tags.push(tag);
    return tag;
  }

  const tagMatch = route.match(/^\/api\/notes\/tags\/(\d+)$/);
  if (tagMatch && method === 'DELETE') {
    const id = Number(tagMatch[1]);
    state.tags = state.tags.filter((tag) => tag.id !== id);
    for (const note of state.notes) note.tagIds = note.tagIds.filter((tagId) => tagId !== id);
    return { ok: true };
  }

  if (route === '/api/chat/conversations' && method === 'GET') {
    const limit = Number(url.searchParams.get('limit') || 50);
    const offset = Number(url.searchParams.get('offset') || 0);
    return {
      items: state.conversations.slice(offset, offset + limit).map(conversationSummary).map(clone),
      total: state.conversations.length,
    };
  }
  if (route === '/api/chat/conversations' && method === 'POST') {
    const now = timestamp();
    const conversation = { id: nextId('conversation'), title: String(body.title || '新对话'), createdAt: now, updatedAt: now };
    state.conversations.unshift(conversation);
    state.messages.set(conversation.id, []);
    return clone(conversation);
  }

  const conversationMatch = route.match(/^\/api\/chat\/conversations\/(\d+)(\/messages)?$/);
  if (conversationMatch) {
    const id = Number(conversationMatch[1]);
    const conversation = state.conversations.find((item) => item.id === id);
    if (!conversation) return { error: 'NOT_FOUND' };
    const messages = state.messages.get(id) || [];
    if (conversationMatch[2] === '/messages' && method === 'GET') return { items: clone(messages) };
    if (conversationMatch[2] === '/messages' && method === 'POST') {
      const message = { id: nextId('message'), role: body.role || 'user', content: String(body.content || ''), createdAt: timestamp() };
      messages.push(message);
      state.messages.set(id, messages);
      conversation.updatedAt = timestamp();
      return clone(message);
    }
    if (!conversationMatch[2] && method === 'POST') {
      conversation.title = String(body.title || conversation.title);
      conversation.updatedAt = timestamp();
      return clone(conversation);
    }
    if (!conversationMatch[2] && method === 'DELETE') {
      state.conversations = state.conversations.filter((item) => item.id !== id);
      state.messages.delete(id);
      return { ok: true };
    }
  }

  if (route === '/api/settings/profile' && method === 'GET') return { profile: clone(state.profile) };
  if (route === '/api/settings/profile' && method === 'PUT') {
    state.profile = { ...state.profile, ...clone(body.profile || {}) };
    return { ok: true };
  }
  if (route === '/api/settings/display' && method === 'GET') return clone(state.display);
  if (route === '/api/settings/display' && method === 'PUT') {
    state.display = { ...state.display, ...clone(body) };
    return clone(state.display);
  }
  if (route === '/api/settings/security/change-password' && method === 'POST') {
    // 本地模式无服务端密码存储；表单仍保留与正式设置页一致的成功响应。
    return { ok: true };
  }
  if (route === '/api/settings/security/session' && method === 'GET') return { duration: state.sessionDuration };
  if (route === '/api/settings/security/session' && method === 'PUT') {
    state.sessionDuration = body.duration || state.sessionDuration;
    return { duration: state.sessionDuration };
  }
  if (route === '/api/settings/database' && method === 'GET') {
    return {
      driver: storageMode === 'indexeddb' ? 'indexeddb' : 'memory',
      migrationsVersion: 0,
      encryptionConfigured: false,
      tables: {
        notes: state.notes.length,
        tags: state.tags.length,
        conversations: state.conversations.length,
        messages: [...state.messages.values()].reduce((total, items) => total + items.length, 0),
      },
    };
  }

  return {};
}

/**
 * 调用本地 API。请求在当前页面串行执行，避免读-改-写快照互相覆盖。
 * IndexedDB 失败时只影响持久化，不影响本地预览的当前操作。
 */
export function offlineRequest(path, options = {}) {
  const task = operationQueue.then(async () => {
    await ensureHydrated();
    const result = await handleRequest(path, options);
    await persistState();
    return clone(result);
  });
  operationQueue = task.catch(() => {});
  return task;
}

/** 读取本地预览数据层状态，用于设置页或诊断信息。 */
export async function getOfflineStorageInfo() {
  await ensureHydrated();
  return { driver: storageMode, persistent: storageMode === 'indexeddb' };
}

/** 测试和重新打开预览时使用：清空 IndexedDB 快照或内存数据。 */
export function resetOfflineState() {
  const task = operationQueue.then(async () => {
    await ensureHydrated();
    state = createInitialState();
    await persistState();
  });
  operationQueue = task.catch(() => {});
  return task;
}
