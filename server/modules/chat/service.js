/**
 * server/modules/chat/service.js
 * 对话业务逻辑：会话 CRUD + 消息追加。SQL 来自 server/db/query/chat.queries.js（参数化）。
 * 会话列表带 lastMessage/messageCount 子查询（单条查询返回，无 N+1）。
 */

import { schemas, validate } from '../../../shared/validation.js';
import { HttpError } from '../../core/middleware.js';
import {
  SELECT_CONVERSATIONS,
  COUNT_CONVERSATIONS,
  SELECT_CONVERSATION_BY_ID,
  INSERT_CONVERSATION,
  UPDATE_CONVERSATION,
  DELETE_CONVERSATION,
  DELETE_MESSAGES_BY_CONVERSATION,
  SELECT_MESSAGES,
  INSERT_MESSAGE,
  SELECT_MESSAGE_BY_ID,
  TOUCH_CONVERSATION,
} from '../../db/query/chat.queries.js';

const now = () => new Date().toISOString();

export async function listConversations(app, { limit = 50, offset = 0 }) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const [rows, countRows] = await Promise.all([
    app.db.query(SELECT_CONVERSATIONS, [safeLimit, safeOffset]),
    app.db.query(COUNT_CONVERSATIONS),
  ]);
  return { items: rows, total: Number(countRows[0]?.total ?? 0) };
}

export async function getConversation(app, id) {
  const rows = await app.db.query(SELECT_CONVERSATION_BY_ID, [id]);
  if (!rows.length) throw new HttpError(404, 'NOT_FOUND');
  return rows[0];
}

export async function createConversation(app, { title }) {
  if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'VALIDATION');
  const res = await app.db.execute(INSERT_CONVERSATION, [String(title).trim(), now(), now()]);
  return getConversation(app, Number(res.lastInsertRowid));
}

export async function renameConversation(app, id, { title }) {
  await getConversation(app, id);
  if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'VALIDATION');
  await app.db.execute(UPDATE_CONVERSATION, [String(title).trim(), now(), id]);
  return getConversation(app, id);
}

export async function deleteConversation(app, id) {
  await getConversation(app, id);
  await app.db.transaction(async (tx) => {
    await tx.execute(DELETE_MESSAGES_BY_CONVERSATION, [id]);
    await tx.execute(DELETE_CONVERSATION, [id]);
  });
  return { ok: true };
}

export async function listMessages(app, conversationId) {
  await getConversation(app, conversationId);
  const rows = await app.db.query(SELECT_MESSAGES, [conversationId]);
  return { items: rows };
}

/** 追加消息（role 限 user/assistant/system），并触达会话 updated_at */
export async function sendMessage(app, conversationId, { role = 'user', content }) {
  await getConversation(app, conversationId);
  const errors = validate({ role, content }, schemas.message);
  if (Object.keys(errors).length) {
    const err = new HttpError(400, 'VALIDATION');
    err.details = errors;
    throw err;
  }
  const timestamp = now();
  const res = await app.db.execute(INSERT_MESSAGE, [conversationId, role, String(content), timestamp]);
  await app.db.execute(TOUCH_CONVERSATION, [timestamp, conversationId]);
  const rows = await app.db.query(SELECT_MESSAGE_BY_ID, [Number(res.lastInsertRowid)]);
  return rows[0];
}