/**
 * notes 模块 API（仅经 app/lib/fetcher.js 统一封装，自动携带 X-Auth-Password）。
 */

import { get, post, put, del } from '../../lib/fetcher.js';

/** 列表（支持按标签/关键词过滤 + 分页） */
export function listNotes({ tag = '', search = '', limit = 20, offset = 0 } = {}) {
  const q = new URLSearchParams();
  if (tag) q.set('tag', tag);
  if (search) q.set('search', search);
  q.set('limit', String(limit));
  q.set('offset', String(offset));
  return get(`/api/notes?${q.toString()}`);
}

export function createNote(payload) {
  return post('/api/notes', payload);
}

export function updateNote(id, payload) {
  return put(`/api/notes/${id}`, payload);
}

export function deleteNote(id) {
  return del(`/api/notes/${id}`);
}

/** 标签：列表（含使用计数）/ 新建 / 删除 */
export function listTags() {
  return get('/api/notes/tags');
}

export function createTag(name) {
  return post('/api/notes/tags', { name });
}

export function deleteTag(id) {
  return del(`/api/notes/tags/${id}`);
}