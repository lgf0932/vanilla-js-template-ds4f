/**
 * settings 模块 API（敏感字段加密/解密全部在后端 service 完成，前端只传明文）。
 */

import { get, put, post } from '../../lib/fetcher.js';

/** 读取用户资料（服务端解密后返回明文） */
export function getProfile() {
  return get('/api/settings/profile');
}

/** 保存用户资料（服务端 AES-GCM 加密落库） */
export function saveProfile(profile) {
  return put('/api/settings/profile', { profile });
}

/** 读取显示设置（主题/语言） */
export function getDisplay() {
  return get('/api/settings/display');
}

/** 保存显示设置 */
export function saveDisplay({ theme, language }) {
  return put('/api/settings/display', { theme, language });
}

/** 修改管理密码（旧密码校验 + PBKDF2 重哈希） */
export function changePassword({ currentPassword, newPassword }) {
  return post('/api/settings/security/change-password', { currentPassword, newPassword });
}

/** 读取默认会话时长 */
export function getSessionDuration() {
  return get('/api/settings/security/session');
}

/** 设置默认会话时长 */
export function setSessionDuration(duration) {
  return put('/api/settings/security/session', { duration });
}

/** 只读数据库信息（驱动 / 迁移版本 / 表计数） */
export function getDatabaseInfo() {
  return get('/api/settings/database');
}