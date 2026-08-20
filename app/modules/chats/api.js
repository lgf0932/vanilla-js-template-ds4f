import { get, post, put, del, ApiError } from '../../lib/fetcher.js';
import { auth } from '../../core/auth.js';
import { isFileRuntime } from '../../core/runtime.js';
import { AUTH_HEADER } from '../../../shared/constants.js';

export const FALLBACK_CONFIG = {
  providers: [
    { id: 'openrouter', name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o-mini'], hasKey: false },
    { id: 'ollama', name: 'Ollama', kind: 'openai', baseUrl: 'http://localhost:11434/v1', models: ['llama3.2'], hasKey: false },
  ],
  defaults: { providerId: 'openrouter', model: 'openai/gpt-4o-mini', temperature: 0.7, topP: 1, maxTokens: 4096, thinking: 'none', webSearch: false },
};

export function listConversations() {
  return get('/api/chat/conversations?limit=100&offset=0');
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

export function listMessages(id) {
  return get(`/api/chat/conversations/${id}/messages`);
}

export function sendMessage(id, message) {
  return post(`/api/chat/conversations/${id}/messages`, message);
}

export async function getConfig() {
  if (isFileRuntime) return FALLBACK_CONFIG;
  try {
    const value = await get('/api/chats/config');
    return value?.providers ? value : FALLBACK_CONFIG;
  } catch {
    return FALLBACK_CONFIG;
  }
}

export function saveConfig(config) {
  if (isFileRuntime) return Promise.resolve(config);
  return put('/api/chats/config', config);
}

export async function streamChat(payload, onEvent) {
  if (isFileRuntime) {
    onEvent({ type: 'start' });
    onEvent({ type: 'delta', text: '本地预览模式未连接大模型。请在 HTTP 部署后于参数面板配置供应商和 API Key。' });
    onEvent({ type: 'done' });
    return;
  }
  const headers = new Headers({ accept: 'text/event-stream', 'content-type': 'application/json' });
  const token = auth.getToken();
  if (token) headers.set(AUTH_HEADER, token);
  const response = await fetch('/api/chats/stream', { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error || 'stream.failed', body);
  }
  if (!response.body) throw new ApiError(502, 'stream.unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try { onEvent(JSON.parse(data)); } catch { /* 忽略心跳 */ }
    }
  }
}