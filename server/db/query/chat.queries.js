/**
 * server/db/query/chat.queries.js
 * chat 模块 SQL 集中管理（一律参数化，杜绝 N+1：会话列表用子查询带出最后消息与计数）。
 * 表：chat_conversations / chat_messages（见 ARCHITECTURE 4.5 节）。
 */

export const SELECT_CONVERSATIONS =
  `SELECT c.id, c.title, c.created_at AS createdAt, c.updated_at AS updatedAt,
          (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS messageCount,
          (SELECT m.content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage
   FROM chat_conversations c
   ORDER BY c.updated_at DESC
   LIMIT ? OFFSET ?`;

export const COUNT_CONVERSATIONS =
  'SELECT COUNT(*) AS total FROM chat_conversations';

export const SELECT_CONVERSATION_BY_ID =
  `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
   FROM chat_conversations WHERE id = ?`;

export const INSERT_CONVERSATION =
  'INSERT INTO chat_conversations (title, created_at, updated_at) VALUES (?, ?, ?)';

export const UPDATE_CONVERSATION =
  `UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?`;

export const DELETE_CONVERSATION =
  'DELETE FROM chat_conversations WHERE id = ?';

export const DELETE_MESSAGES_BY_CONVERSATION =
  'DELETE FROM chat_messages WHERE conversation_id = ?';

export const SELECT_MESSAGES =
  `SELECT id, conversation_id AS conversationId, role, content, created_at AS createdAt
   FROM chat_messages
   WHERE conversation_id = ?
   ORDER BY id ASC`;

export const INSERT_MESSAGE =
  `INSERT INTO chat_messages (conversation_id, role, content, created_at)
   VALUES (?, ?, ?, ?)`;

export const SELECT_MESSAGE_BY_ID =
  `SELECT id, conversation_id AS conversationId, role, content, created_at AS createdAt
   FROM chat_messages WHERE id = ?`;

export const TOUCH_CONVERSATION =
  'UPDATE chat_conversations SET updated_at = ? WHERE id = ?';