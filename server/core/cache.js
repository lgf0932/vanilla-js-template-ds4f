/**
 * server/core/cache.js
 * 进程内存 LRU（Map + 双向链表实现，ARCHITECTURE.md 4.7 节第 2 层），
 * 用于缓存高延迟查询结果（D1/Turso），TTL 可按查询类型配置。
 */

class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  /**
   * @param {{ max?: number, ttlMs?: number }} [opts] max=容量条数, ttlMs=过期毫秒
   */
  constructor({ max = 100, ttlMs = 60_000 } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.map = new Map(); // key -> Node
    this.head = null;
    this.tail = null;
    this.timestamps = new Map(); // key -> 写入时间
  }

  get size() {
    return this.map.size;
  }

  _unlink(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  _pushFront(node) {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return undefined;
    const wroteAt = this.timestamps.get(key) || 0;
    if (this.ttlMs > 0 && Date.now() - wroteAt > this.ttlMs) {
      this.delete(key);
      return undefined;
    }
    // 命中 → 移到队首
    this._unlink(node);
    this._pushFront(node);
    return node.value;
  }

  put(key, value) {
    if (this.max <= 0) return value;
    let node = this.map.get(key);
    if (node) {
      this._unlink(node);
      node.value = value;
    } else {
      node = new Node(key, value);
      this.map.set(key, node);
    }
    this._pushFront(node);
    this.timestamps.set(key, Date.now());

    // 淘汰队尾
    if (this.map.size > this.max) {
      const evict = this.tail;
      if (evict) this.delete(evict.key);
    }
    return value;
  }

  delete(key) {
    const node = this.map.get(key);
    if (!node) return;
    this._unlink(node);
    this.map.delete(key);
    this.timestamps.delete(key);
  }

  clear() {
    this.map.clear();
    this.timestamps.clear();
    this.head = null;
    this.tail = null;
  }
}