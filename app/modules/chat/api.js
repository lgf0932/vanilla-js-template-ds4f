/**
 * chat 模块 API（仅经统一 fetcher）。
 */

import { get, post, del } from '../../lib/fetcher.js';

export function listConversations({ limit = 50, offset = 0 } = {}) {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return get(`/api/chat/conversations?${q}`);
}

export function createConversation(title) {
  return post('/api/chat/conversations', { title });
}

export function renameConversation(id, title) {
  return post(`/api/chat/conversations/${id}`, { title });
}

export function deleteConversation(id) {
  return del(`/api/chat/conversations/${id}`);
}

export function listMessages(conversationId) {
  return get(`/api/chat/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId, { role, content }) {
  return post(`/api/chat/conversations/${conversationId}/messages`, { role, content });
}