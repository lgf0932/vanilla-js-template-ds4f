/**
 * notes 模块私有 store（模块级单例；与其它模块 store 相互独立）。
 */

import { createStore } from '../../core/store.js';
import * as api from './api.js';

const initialState = {
  notes: [],
  tags: [],
  total: 0,
  selectedTag: '',
  search: '',
  offset: 0,
  limit: 20,
  loading: false,
  error: '',
};

export const store = createStore(initialState);

/** 拉取标签（供列表过滤与编辑器使用）；失败不阻塞 */
export async function loadTags() {
  try {
    const data = await api.listTags();
    store.setState({ tags: data.items || [] });
  } catch {
    /* 静默，编辑器仍可新建 */
  }
}

/** 拉取笔记列表（合并当前过滤条件；more=true 追加下一页） */
export async function loadNotes({ more = false } = {}) {
  const { selectedTag, search, offset, limit } = store.getState();
  const nextOffset = more ? offset + limit : 0;
  store.setState({ loading: true, error: '' });
  try {
    const data = await api.listNotes({ tag: selectedTag, search, limit, offset: nextOffset });
    store.setState({
      notes: more ? [...store.getState().notes, ...(data.items || [])] : data.items || [],
      total: data.total || 0,
      offset: nextOffset,
      loading: false,
    });
  } catch (err) {
    store.setState({ loading: false, error: err.message || 'load failed' });
  }
}

export async function createNote(payload) {
  const note = await api.createNote(payload);
  await Promise.all([loadTags(), loadNotes()]);
  return note;
}

export async function updateNote(id, payload) {
  const note = await api.updateNote(id, payload);
  await Promise.all([loadTags(), loadNotes()]);
  return note;
}

export async function removeNote(id) {
  await api.deleteNote(id);
  await Promise.all([loadTags(), loadNotes()]);
}

export async function createTag(name) {
  const tag = await api.createTag(name);
  await loadTags();
  return tag;
}

export async function removeTag(id) {
  await api.deleteTag(id);
  await Promise.all([loadTags(), loadNotes()]);
}

export function setFilter({ tag, search } = {}) {
  store.setState({
    selectedTag: tag !== undefined ? tag : store.getState().selectedTag,
    search: search !== undefined ? search : store.getState().search,
    offset: 0,
  });
  loadNotes();
}