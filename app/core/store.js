/**
 * app/core/store.js
 * 手写 Proxy 响应式容器工厂（ARCHITECTURE.md 3.7 节）：
 *  - 每个模块调用一次 createStore() 得到私有 store，不共享全局单一 store
 *  - getState() 返回响应式 Proxy：直接改属性（store.state.x = 1）同样触发订阅
 *  - setState() 批量写入（内部仍走 Proxy 拦截，通知订阅者）
 */

/**
 * @param {object} initialState
 * @returns {{
 *   state: object,
 *   getState: () => object,
 *   setState: (patch: object | ((s:object) => object)) => object,
 *   subscribe: (fn: (s:object) => void) => () => void,
 *   reset: () => void
 * }}
 */
export function createStore(initialState = {}) {
  const target = { ...initialState };
  const listeners = new Set();
  let suppressing = false; // reset() 期间合并通知

  const emit = () => {
    if (suppressing) return;
    for (const fn of listeners) fn(proxy);
  };

  const proxy = new Proxy(target, {
    set(t, key, value) {
      if (t[key] !== value) {
        t[key] = value;
        emit();
      }
      return true;
    },
    deleteProperty(t, key) {
      if (key in t) {
        delete t[key];
        emit();
      }
      return true;
    },
  });

  return {
    /** 响应式状态本体（可直接读写，写入触发订阅） */
    state: proxy,

    getState: () => proxy,

    /** 批量写入：合并对象或函数式更新（函数收到当前状态快照） */
    setState(patch) {
      const next = typeof patch === 'function' ? patch({ ...proxy }) : patch;
      for (const [key, value] of Object.entries(next || {})) {
        proxy[key] = value;
      }
      return proxy;
    },

    /** 订阅变更；返回取消订阅函数 */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** 恢复初始状态（批量替换，只通知一次） */
    reset() {
      suppressing = true;
      try {
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, { ...initialState });
      } finally {
        suppressing = false;
      }
      emit();
    },
  };
}