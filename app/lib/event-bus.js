/**
 * app/lib/event-bus.js
 * 极简发布/订阅事件总线。仅用于必须跨模块通知的极少数场景（如全局 toast），
 * 不能替代模块间数据依赖——模块间原则上不应有数据依赖（ARCHITECTURE.md 3.7 节）。
 */

export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const topics = new Map();

  return {
    /** 订阅；返回取消订阅函数 */
    on(event, fn) {
      if (!topics.has(event)) topics.set(event, new Set());
      topics.get(event).add(fn);
      return () => this.off(event, fn);
    },

    /** 一次性订阅 */
    once(event, fn) {
      const wrapper = (payload) => {
        this.off(event, wrapper);
        fn(payload);
      };
      return this.on(event, wrapper);
    },

    off(event, fn) {
      const set = topics.get(event);
      if (set) set.delete(fn);
    },

    /** 发布；异常不打断其它订阅者 */
    emit(event, payload) {
      const set = topics.get(event);
      if (!set) return;
      for (const fn of [...set]) {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[event-bus] listener "${event}" failed:`, err);
        }
      }
    },

    clear(event) {
      if (event) topics.delete(event);
      else topics.clear();
    },
  };
}

/** 全局总线 */
export const appBus = createEventBus();