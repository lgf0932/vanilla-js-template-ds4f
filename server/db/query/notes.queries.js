/**
 * server/db/query/notes.queries.js
 * notes 模块 SQL 集中管理（一律参数化；IN 列表仅由内部生成的占位符拼接，不含用户输入）。
 * 表：notes_data / notes_tags / notes_tags_bindings（见 ARCHITECTURE 4.5 节）。
 */

export const SELECT_NOTES =
  `SELECT n.id, n.title, n.body, n.created_at AS createdAt, n.updated_at AS updatedAt
   FROM notes_data n
   WHERE (? = '' OR n.title LIKE ? OR n.body LIKE ?)
     AND (? IS NULL OR EXISTS (SELECT 1 FROM notes_tags_bindings nb WHERE nb.note_id = n.id AND nb.tag_id = ?))
   ORDER BY n.updated_at DESC
   LIMIT ? OFFSET ?`;

export const COUNT_NOTES =
  `SELECT COUNT(*) AS total
   FROM notes_data n
   WHERE (? = '' OR n.title LIKE ? OR n.body LIKE ?)
     AND (? IS NULL OR EXISTS (SELECT 1 FROM notes_tags_bindings nb WHERE nb.note_id = n.id AND nb.tag_id = ?))`;

export const SELECT_NOTE_BY_ID =
  `SELECT id, title, body, created_at AS createdAt, updated_at AS updatedAt
   FROM notes_data WHERE id = ?`;

export const INSERT_NOTE =
  'INSERT INTO notes_data (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)';

export const UPDATE_NOTE =
  `UPDATE notes_data SET title = ?, body = ?, updated_at = ? WHERE id = ?`;

export const DELETE_NOTE =
  'DELETE FROM notes_data WHERE id = ?';

export const SELECT_TAGS =
  `SELECT t.id, t.name, COUNT(nb.note_id) AS count
   FROM notes_tags t
   LEFT JOIN notes_tags_bindings nb ON nb.tag_id = t.id
   GROUP BY t.id
   ORDER BY t.name ASC`;

export const SELECT_TAG_BY_NAME =
  'SELECT id, name FROM notes_tags WHERE name = ?';

export const SELECT_TAG_BY_ID =
  'SELECT id, name FROM notes_tags WHERE id = ?';

export const INSERT_TAG =
  'INSERT INTO notes_tags (name) VALUES (?)';

export const DELETE_TAG =
  'DELETE FROM notes_tags WHERE id = ?';

export const SELECT_TAGS_BY_NOTE_IDS =
  `SELECT nb.note_id AS noteId, t.id, t.name
   FROM notes_tags_bindings nb
   JOIN notes_tags t ON t.id = nb.tag_id
   WHERE nb.note_id IN ({placeholders})`;

export const INSERT_BINDING =
  'INSERT OR IGNORE INTO notes_tags_bindings (note_id, tag_id) VALUES (?, ?)';

export const DELETE_BINDINGS_BY_NOTE =
  'DELETE FROM notes_tags_bindings WHERE note_id = ?';

export const DELETE_BINDINGS_BY_TAG =
  'DELETE FROM notes_tags_bindings WHERE tag_id = ?';