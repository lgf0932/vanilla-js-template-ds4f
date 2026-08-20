-- ============================================================================
-- 0001_schema_init.sql — 初始建表（一个迁移只做一件事：初始 schema）
-- 表命名规范：`[module]_[entity]`、子模块专属 `[module]_[submodule]_[entity]`
-- 全局配置一律走 app_settings，不为全局配置新建专用表
-- ============================================================================

-- ---- 全局配置（键值表，key 命名 domain:subject[:field]，见 ARCHITECTURE 4.5 节） ----
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ---- notes 模块 ----
CREATE TABLE IF NOT EXISTS notes_data (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes_data (updated_at DESC);

CREATE TABLE IF NOT EXISTS notes_tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS notes_tags_bindings (
  note_id INTEGER NOT NULL REFERENCES notes_data (id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES notes_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_bindings_tag ON notes_tags_bindings (tag_id);

-- ---- chat 模块 ----
CREATE TABLE IF NOT EXISTS chat_conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated ON chat_conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages (conversation_id, id);