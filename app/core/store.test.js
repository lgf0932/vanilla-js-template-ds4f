import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.js';

test('createStore: 初始状态与取值', () => {
  const store = createStore({ a: 1 });
  assert.equal(store.getState().a, 1);
});

test('createStore: setState 合并并触发订阅', () => {
  const store = createStore({ a: 1, b: 2 });
  const seen = [];
  const off = store.subscribe((s) => seen.push(s));
  store.setState({ a: 10 });
  store.setState((s) => ({ b: s.b + 1 }));
  assert.equal(store.getState().a, 10);
  assert.equal(store.getState().b, 3);
  assert.equal(seen.length, 2);
  off();
  store.setState({ a: 99 });
  assert.equal(seen.length, 2);
});

test('Proxy 响应式：直接改 state 属性同样触发订阅', () => {
  const store = createStore({ n: 0 });
  let calls = 0;
  store.subscribe(() => calls++);
  store.state.n = 5; // 直接属性写入 → Proxy set 拦截 → 通知
  assert.equal(store.getState().n, 5);
  assert.equal(calls, 1);
  store.state.n = 5; // 值未变化 → 不通知
  assert.equal(calls, 1);
  delete store.state.n; // deleteProperty 拦截 → 通知
  assert.equal(calls, 2);
  assert.equal(store.getState().n, undefined);
});

test('createStore: reset 恢复初始状态', () => {
  const store = createStore({ a: 1 });
  store.setState({ a: 2 });
  store.reset();
  assert.equal(store.getState().a, 1);
});

test('createStore: 模块间实例互不影响（无全局单一 store）', () => {
  const s1 = createStore({ n: 0 });
  const s2 = createStore({ n: 0 });
  s1.setState({ n: 5 });
  assert.equal(s2.getState().n, 0);
});