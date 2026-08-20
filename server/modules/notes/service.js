/**
 * server/modules/notes/service.js
 * 笔记业务逻辑：CRUD + 标签绑定。SQL 一律来自 server/db/query/notes.queries.js（参数化）。
 * 列表通过一次 IN 查询回填标签，避免 N+1。
 */

import { schemas, validate } from '../../../shared/validation.js';
import { HttpError } from '../../core/middleware.js';
import {
  SELECT_NOTES,
  COUNT_NOTES,
  SELECT_NOTE_BY_ID,
  INSERT_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  SELECT_TAGS,
  SELECT_TAG_BY_NAME,
  SELECT_TAG_BY_ID,
  INSERT_TAG,
  DELETE_TAG,
  SELECT_TAGS_BY_NOTE_IDS,
  INSERT_BINDING,
  DELETE_BINDINGS_BY_NOTE,
  DELETE_BINDINGS_BY_TAG,
} from '../../db/query/notes.queries.js';

const now = () => new Date().toISOString();
const like = (s) => `%${s}%`;

/** 列表：tag=标签 id（可空），search=标题/正文关键词，limit/offset 分页 */
export async function listNotes(app, { tag = '', search = '', limit = 20, offset = 0 }) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const tagId = tag ? Number(tag) || null : null;

  const [rows, countRows] = await Promise.all([
    app.db.query(SELECT_NOTES, [search, like(search), like(search), tagId, tagId, safeLimit, safeOffset]),
    app.db.query(COUNT_NOTES, [search, like(search), like(search), tagId, tagId]),
  ]);

  const items = await attachTags(app, rows);
  return { items, total: Number(countRows[0]?.total ?? 0) };
}

export async function getNote(app, id) {
  const rows = await app.db.query(SELECT_NOTE_BY_ID, [id]);
  if (!rows.length) throw new HttpError(404, 'NOT_FOUND');
  const [note] = await attachTags(app, rows);
  return note;
}

export async function createNote(app, { title, body = '', tagIds = [] }) {
  const errors = validate({ title, body }, schemas.note);
  if (errors.title) {
    const err = new HttpError(400, 'VALIDATION');
    err.details = errors;
    throw err;
  }
  const timestamp = now();
  const res = await app.db.execute(INSERT_NOTE, [String(title), String(body), timestamp, timestamp]);
  const id = Number(res.lastInsertRowid);
  await rebindTags(app, id, tagIds);
  return getNote(app, id);
}

export async function updateNote(app, id, { title, body, tagIds }) {
  const existing = await getNote(app, id); // 404 校验
  if (title === undefined) title = existing.title;
  if (body === undefined) body = existing.body;
  const errors = validate({ title, body }, schemas.note);
  if (errors.title) {
    const err = new HttpError(400, 'VALIDATION');
    err.details = errors;
    throw err;
  }
  await app.db.execute(UPDATE_NOTE, [String(title), String(body), now(), id]);
  if (tagIds !== undefined) await rebindTags(app, id, tagIds);
  return getNote(app, id);
}

export async function deleteNote(app, id) {
  await getNote(app, id); // 404 校验
  await app.db.transaction(async (tx) => {
    await tx.execute(DELETE_BINDINGS_BY_NOTE, [id]);
    await tx.execute(DELETE_NOTE, [id]);
  });
  return { ok: true };
}

/** 标签列表（含每标签使用计数） */
export async function listTags(app) {
  const rows = await app.db.query(SELECT_TAGS);
  return { items: rows };
}

/** 新建标签；同名已存在则幂等返回既有标签 */
export async function createTag(app, { name }) {
  const errors = validate({ name }, schemas.tag);
  if (errors.name) {
    const err = new HttpError(400, 'VALIDATION');
    err.details = errors;
    throw err;
  }
  const existing = await app.db.query(SELECT_TAG_BY_NAME, [String(name).trim()]);
  if (existing.length) return existing[0];
  const res = await app.db.execute(INSERT_TAG, [String(name).trim()]);
  const rows = await app.db.query(SELECT_TAG_BY_ID, [Number(res.lastInsertRowid)]);
  return rows[0];
}

export async function deleteTag(app, id) {
  await app.db.transaction(async (tx) => {
    await tx.execute(DELETE_BINDINGS_BY_TAG, [id]);
    await tx.execute(DELETE_TAG, [id]);
  });
  return { ok: true };
}

/** 批量回填标签（一次 IN 查询，避免 N+1） */
async function attachTags(app, rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => Number(r.id));
  const sql = SELECT_TAGS_BY_NOTE_IDS.replace('{placeholders}', ids.map(() => '?').join(','));
  const bindings = await app.db.query(sql, ids);
  const byNote = new Map();
  for (const b of bindings) {
    const list = byNote.get(Number(b.noteId)) || [];
    list.push({ id: b.id, name: b.name });
    byNote.set(Number(b.noteId), list);
  }
  return rows.map((r) => ({ ...r, tags: byNote.get(Number(r.id)) || [] }));
}

/** 重建某笔记的标签绑定（先清后插，事务内） */
async function rebindTags(app, noteId, tagIds) {
  const ids = [...new Set([...(tagIds || [])].map(Number).filter(Number.isFinite))];
  await app.db.transaction(async (tx) => {
    await tx.execute(DELETE_BINDINGS_BY_NOTE, [noteId]);
    for (const tagId of ids) {
      const exists = await tx.query(SELECT_TAG_BY_ID, [tagId]);
      if (exists.length) await tx.execute(INSERT_BINDING, [noteId, tagId]);
    }
  });
}