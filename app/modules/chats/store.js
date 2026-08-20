import { createStore } from '../../core/store.js';
import * as api from './api.js';

export const store = createStore({
  conversations: [],
  total: 0,
  activeId: null,
  messages: [],
  query: '',
  view: 'all',
  config: null,
  keyDrafts: {},
  loading: false,
  streaming: false,
  error: '',
});

export async function loadChats() {
  store.setState({ loading: true, error: '' });
  try {
    const [list, config] = await Promise.all([api.listConversations(), api.getConfig()]);
    store.setState({ conversations: list.items || [], total: list.total || 0, config, loading: false });
  } catch (error) {
    store.setState({ loading: false, error: error.message || 'load.failed' });
  }
}

export function visibleConversations() {
  const state = store.getState();
  const query = state.query.trim().toLocaleLowerCase();
  return state.conversations.filter((conversation) => !query || `${conversation.title} ${conversation.lastMessage || ''}`.toLocaleLowerCase().includes(query));
}

export async function openChat(id) {
  store.setState({ activeId: id, messages: [], error: '' });
  try {
    const data = await api.listMessages(id);
    store.setState({ messages: data.items || [] });
  } catch (error) {
    store.setState({ error: error.message || 'messages.failed' });
  }
}

export async function createChat(title) {
  const data = await api.createConversation(title);
  await loadChats();
  await openChat(data.id);
  return data;
}

export async function removeChat(id) {
  await api.deleteConversation(id);
  if (store.getState().activeId === id) store.setState({ activeId: null, messages: [] });
  await loadChats();
}

export async function sendUserMessage(content, params) {
  const state = store.getState();
  if (!state.activeId || !content.trim() || state.streaming) return;
  const user = await api.sendMessage(state.activeId, { role: 'user', content: content.trim() });
  const messages = [...store.getState().messages, user];
  store.setState({ messages, streaming: true, error: '' });
  let assistant = '';
  try {
    await api.streamChat({ providerId: params.providerId, model: params.model, params, messages }, (event) => {
      if (event.type === 'delta') {
        assistant += event.text || '';
        store.setState({ messages: [...messages, { role: 'assistant', content: assistant, createdAt: new Date().toISOString(), streaming: true }] });
      }
      if (event.type === 'error') throw new Error(event.message || 'stream.failed');
    });
    if (!assistant) assistant = '（供应商没有返回文本）';
    const saved = await api.sendMessage(state.activeId, { role: 'assistant', content: assistant });
    store.setState({ messages: [...messages, saved], streaming: false });
    await loadChats();
    store.setState({ activeId: state.activeId, messages: [...messages, saved], streaming: false });
  } catch (error) {
    store.setState({ streaming: false, error: error.message || 'stream.failed' });
  }
}

export async function persistConfig() {
  const state = store.getState();
  if (!state.config) return state.config;
  const saved = await api.saveConfig({ providers: state.config.providers, defaults: state.config.defaults, keys: state.keyDrafts });
  store.setState({ config: saved, keyDrafts: {} });
  return saved;
}