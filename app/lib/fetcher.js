/**
 * app/lib/fetcher.js
 * 统一 fetch 封装：自动附加 X-Auth-Password 请求头、统一错误处理、
 * 401 时触发 app/core/auth.js 的重新鉴权流程（ARCHITECTURE.md 3.7 节）。
 */

import { auth } from '../core/auth.js';
import { AUTH_HEADER } from '../../shared/constants.js';

export class ApiError extends Error {
  constructor(status, message, body = null) {
    super(message || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {string} path 以 /api 开头的接口路径
 * @param {{method?:string, body?:any, headers?:Record<string,string>, signal?:AbortSignal}} options
 */
export async function fetcher(path, options = {}) {
  const { method = 'GET', body, headers = {}, signal } = options;

  const h = new Headers(headers);
  h.set('accept', 'application/json');
  const token = auth.getToken();
  if (token) h.set(AUTH_HEADER, token);
  if (body !== undefined && !(body instanceof FormData)) {
    h.set('content-type', 'application/json');
  }

  let res;
  try {
    res = await fetch(path, {
      method,
      headers: h,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network');
  }

  const data = await res.json().catch(() => null);

  // 会话失效：清空本地凭证并广播，由 auth-gate 接管
  if (res.status === 401 && !path.endsWith('/api/auth/login')) {
    auth.handleUnauthorized();
    throw new ApiError(401, (data && data.error) || 'unauthorized', data);
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || res.statusText, data);
  }
  return data;
}

export const get = (path, options = {}) => fetcher(path, options);
export const post = (path, body, options = {}) => fetcher(path, { ...options, method: 'POST', body });
export const put = (path, body, options = {}) => fetcher(path, { ...options, method: 'PUT', body });
export const del = (path, options = {}) => fetcher(path, { ...options, method: 'DELETE' });