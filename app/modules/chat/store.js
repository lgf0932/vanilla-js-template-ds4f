/**
 * chat 模块私有 store：会话列表 + 当前会话消息线程。
 */

import { createStore } from '../../core/store.js';
import * as api from './api.js';

const initialState = {
  conversations: [],
  total: 0,
  activeId: null,
  messages: [],
  loading: false,
  error: '',
};

export const store = createStore(initialState);

export async function loadConversations() {
  store.setState({ loading: true, error: '' });
  try {
    const data = await api.listConversations();
    store.setState({ conversations: data.items || [], total: data.total || 0, loading: false });
  } catch (err) {
    store.setState({ loading: false, error: err.message || 'load failed' });
  }
}

export async function openConversation(id) {
  store.setState({ activeId: id, messages: [] });
  const data = await api.listMessages(id);
  store.setState({ messages: data.items || [] });
}

export async function createConversation(title) {
  const data = await api.createConversation(title);
  await loadConversations();
  await openConversation(data.id);
  return data;
}

export async function removeConversation(id) {
  await api.deleteConversation(id);
  if (store.getState().activeId === id) store.setState({ activeId: null, messages: [] });
  await loadConversations();
}

export async function sendMessage(conversationId, { role, content }) {
  const data = await api.sendMessage(conversationId, { role, content });
  const messages = [...store.getState().messages, data];
  store.setState({ messages });
  await loadConversations();
  return data;
}