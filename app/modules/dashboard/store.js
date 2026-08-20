/**
 * dashboard 模块私有 store（createStore 一次调用，不共享全局 store）。
 */

import { createStore } from '../../core/store.js';
import { fetchSummary } from './api.js';

const initialState = {
  loading: false,
  error: '',
  stats: { notes: 0, conversations: 0 },
  recentNotes: [],
  recentConversations: [],
};

export const store = createStore(initialState);

/** 加载概览数据（并发拉取笔记与对话汇总，失败不阻塞整个视图） */
export async function loadSummary() {
  store.setState({ loading: true, error: '' });
  try {
    const data = await fetchSummary();
    store.setState({
      loading: false,
      stats: { notes: data.notes.total, conversations: data.conversations.total },
      recentNotes: data.notes.items.slice(0, 5),
      recentConversations: data.conversations.items.slice(0, 5),
    });
  } catch (err) {
    store.setState({ loading: false, error: err.message || 'load failed' });
  }
}