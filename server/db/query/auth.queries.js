/**
 * server/db/query/auth.queries.js
 * auth 模块使用的 app_settings 键位查询（密码哈希 / 默认会话时长）。
 * 复用 settings.queries.js 的写入语句（同属 db 基础设施层）。
 */

import { SELECT_SETTING, UPSERT_SETTING } from './settings.queries.js';

export const SELECT_PASSWORD_HASH = SELECT_SETTING;
export const SELECT_SESSION_DEFAULT = SELECT_SETTING;
export const UPSERT_AUTH_SETTING = UPSERT_SETTING;