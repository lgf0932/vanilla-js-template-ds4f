import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveDriver } from './resolver.js';

test('显式 DB_DRIVER 永远优先生效', () => {
  assert.equal(resolveDriver({ DB_DRIVER: 'sqlite', DB: {}, NODE_ENV: 'production' }), 'sqlite');
  assert.equal(resolveDriver({ DB_DRIVER: 'turso', DB: {} }), 'turso');
  assert.equal(resolveDriver({ DB_DRIVER: 'd1', NODE_ENV: 'development' }), 'd1');
});

test('非法 DB_DRIVER 抛错', () => {
  assert.throws(() => resolveDriver({ DB_DRIVER: 'mysql' }), /DB_DRIVER/);
});

test('探测到 Cloudflare 运行时特征 → d1', () => {
  assert.equal(resolveDriver({ DB: { prepare() {} }, NODE_ENV: 'production' }), 'd1');
});

test('开发环境默认 sqlite', () => {
  assert.equal(resolveDriver({ NODE_ENV: 'development' }), 'sqlite');
  assert.equal(resolveDriver({ NODE_ENV: 'test' }), 'sqlite');
});

test('其余生产部署（Vercel/Deno/Docker）默认 turso', () => {
  assert.equal(resolveDriver({ NODE_ENV: 'production' }), 'turso');
});

test('边缘 bundle：数据库解析链不静态导入 Node builtins', () => {
  const files = ['resolver.js', 'migrate.js', 'adapters/sqlite.adapter.js'];
  for (const file of files) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /^\s*import\s+.*from\s+["']node:/m, file);
  }
});
