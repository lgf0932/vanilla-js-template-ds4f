/**
 * app/lib/offline-api.js
 * 直接双击 index.html 时使用的内存预览数据层。
 * 仅用于 file:// 预览，不写入数据库、不持久化密码，HTTP 模式仍走真实 API。
 */

const state = {
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
};

let nextNoteId = 1;
let nextTagId = 1;
let nextConversationId = 1;
let nextMessageId = 1;

function clone(value) {
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
      noteCount: state.notes.filter((note) => note.tagIds.includes(tag.id)).length,
    })).map(clone),
  };
}

/** @param {string} path @param {{method?: string, body?: any}} options */
export async function offlineRequest(path, options = {}) {
  const method = options.method || 'GET';
  const body = readBody(options.body);
  const url = new URL(path, 'file:///nova-preview/');
  const route = url.pathname;

  if (route === '/api/notes' && method === 'GET') return listNotes(url);
  if (route === '/api/notes' && method === 'POST') {
    const now = timestamp();
    const note = {
      id: nextNoteId++,
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
    const tag = { id: nextTagId++, name: String(body.name || '未命名标签'), createdAt: timestamp() };
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
    const conversation = { id: nextConversationId++, title: String(body.title || '新对话'), createdAt: timestamp(), updatedAt: timestamp() };
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
      const message = { id: nextMessageId++, role: body.role || 'user', content: String(body.content || ''), createdAt: timestamp() };
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
  if (route === '/api/settings/security/change-password' && method === 'POST') return { ok: true };
  if (route === '/api/settings/security/session' && method === 'GET') return { duration: state.sessionDuration };
  if (route === '/api/settings/security/session' && method === 'PUT') {
    state.sessionDuration = body.duration || state.sessionDuration;
    return { duration: state.sessionDuration };
  }
  if (route === '/api/settings/database' && method === 'GET') {
    return {
      driver: 'offline-preview',
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
