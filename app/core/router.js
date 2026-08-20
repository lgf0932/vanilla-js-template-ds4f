/**
 * app/core/router.js
 * 基于 history.pushState + popstate 的手写路由（ARCHITECTURE.md 3.7 节）。
 * 路由表由模块注册表派生（bootstrap 负责登记），支持二级路径映射子模块。
 */

import { isFileRuntime } from './runtime.js';

/** 规范化路径：去尾部斜杠，保证 '/' 唯一 */
export function normalizePath(path) {
  const p = path || '/';
  if (p.length > 1 && p.endsWith('/')) return p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

function currentLocationPath() {
  if (!isFileRuntime) return normalizePath(window.location.pathname);
  const hash = window.location.hash.replace(/^#/, '');
  return normalizePath(hash || '/');
}

class Router {
  constructor() {
    /** @type {Map<string, {path:string, mount:(viewport:HTMLElement)=>Promise<void>|void}>} */
    this.routes = new Map();
    this.currentPath = currentLocationPath();
    this.onUnmatched = null;

    const eventName = isFileRuntime ? 'hashchange' : 'popstate';
    window.addEventListener(eventName, () => {
      this.currentPath = currentLocationPath();
      this.render();
    });
  }

  /** 登记一条路由；entry 由 bootstrap 依据模块注册表构造 */
  add(path, entry) {
    this.routes.set(normalizePath(path), entry);
  }

  get(path) {
    return this.routes.get(normalizePath(path));
  }

  /** 编程式导航（SPA 内一律走这里，而不是整页刷新） */
  navigate(path, { replace = false } = {}) {
    const normalized = normalizePath(path);
    if (normalized === this.currentPath) {
      this.render();
      return;
    }
    if (isFileRuntime) {
      // file:// 不能可靠地 pushState 到新的磁盘路径，使用 hash 保留同一个 index.html。
      window.location.hash = normalized === '/' ? '' : normalized;
      return;
    }
    if (replace) window.history.replaceState({}, '', normalized);
    else window.history.pushState({}, '', normalized);
    this.currentPath = normalized;
    this.render();
  }

  /** 渲染当前路径对应的模块视图 */
  async render() {
    const path = this.currentPath;
    const entry = this.routes.get(path);

    // 广播路由变化（sidebar 高亮、面包屑等据此更新）
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path } }));

    if (!entry) {
      if (this.onUnmatched) this.onUnmatched(path);
      return;
    }

    const { viewport } = entry;
    if (!viewport) return;
    try {
      await entry.mount(viewport);
    } catch (err) {
      console.error('[router] mount failed:', err);
    }
  }
}

export const router = new Router();