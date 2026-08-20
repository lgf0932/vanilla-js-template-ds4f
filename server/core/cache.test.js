import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache } from './cache.js';

test('LRU: 基础读写与命中更新顺序', () => {
  const cache = new LRUCache({ max: 3, ttlMs: 0 });
  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('c', 3);
  cache.get('a'); // a 移到队首
  cache.put('d', 4); // 淘汰最久未用 b
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.size, 3);
});

test('LRU: TTL 过期后返回 undefined', async () => {
  const cache = new LRUCache({ max: 10, ttlMs: 30 });
  cache.put('k', 'v');
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(cache.get('k'), undefined);
});

test('LRU: delete 与 clear', () => {
  const cache = new LRUCache({ max: 10 });
  cache.put('a', 1);
  cache.delete('a');
  assert.equal(cache.get('a'), undefined);
  cache.put('b', 2);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.get('b'), undefined);
});