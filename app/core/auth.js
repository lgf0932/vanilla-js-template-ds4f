/**
 * app/core/auth.js
 * 单密码全局鉴权的浏览器侧会话管理（ARCHITECTURE.md 4.3 节）：
 *  - 登录成功后持有服务端签发的派生令牌（HMAC 签名，携带过期时间）
 *  - 定时选项 → localStorage；"直到下次浏览器打开" → sessionStorage
 *  - 后端 401 时由 fetcher 触发 handleUnauthorized()，广播 auth:expired → auth-gate 接管
 * 注意：本文件不依赖 fetcher（避免循环依赖），登录请求直接使用原生 fetch。
 */

import { SESSION_DURATIONS, durationIsSessionOnly } from '../../shared/constants.js';
import { isFileRuntime } from './runtime.js';

const TOKEN_KEY = 'nova:auth:token';
const EXPIRES_KEY = 'nova:auth:expires';

function readSession() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

class Auth {
  isAuthenticated() {
    return Boolean(this.getToken());
  }

  /** 当前令牌；超时自动清空并返回 null */
  getToken() {
    const token = readSession();
    if (!token) return null;
    let expires = null;
    try {
      expires = sessionStorage.getItem(EXPIRES_KEY) || localStorage.getItem(EXPIRES_KEY);
    } catch {
      expires = null;
    }
    if (expires && Date.parse(expires) <= Date.now()) {
      this.clearSession();
      return null;
    }
    return token;
  }

  /** 写入会话；duration=session 存 sessionStorage，其余存 localStorage + 过期时间 */
  setSession({ token, expiresAt }, duration) {
    this.clearSession();
    try {
      const store = durationIsSessionOnly(duration) ? sessionStorage : localStorage;
      store.setItem(TOKEN_KEY, token);
      if (expiresAt) store.setItem(EXPIRES_KEY, expiresAt);
    } catch {
      /* file:// 某些浏览器禁用存储，预览仍可在当前页面运行 */
    }
  }

  clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRES_KEY);
    } catch {
      /* file:// 存储不可用时无需清理 */
    }
  }

  /** 会话失效：清空凭证并广播，bootstrap 据此切换到密码输入页 */
  handleUnauthorized() {
    this.clearSession();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  /**
   * 登录（或首次运行设置密码）：POST /api/auth/login。
   * @param {string} password
   * @param {string} duration SESSION_DURATIONS 中的 id
   * @returns {Promise<{token:string, expiresAt:string|null}>}
   */
  async login(password, duration) {
    if (isFileRuntime) {
      const data = { token: 'nova-offline-preview', expiresAt: null };
      this.setSession(data, 'session');
      window.dispatchEvent(new CustomEvent('auth:success', { detail: { duration, offline: true } }));
      return data;
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ password, duration }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'auth.failed');
      err.status = res.status;
      err.body = data;
      throw err;
    }
    if (!durationIsSessionOnly(duration) && !data.expiresAt) {
      const d = SESSION_DURATIONS.find((x) => x.id === duration);
      data.expiresAt = d ? new Date(Date.now() + (d.hours || 0) * 3.6e6 + (d.days || 0) * 8.64e7).toISOString() : null;
    }
    this.setSession(data, duration);
    window.dispatchEvent(new CustomEvent('auth:success', { detail: { duration } }));
    return data;
  }
}

export const auth = new Auth();