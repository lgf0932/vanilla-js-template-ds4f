/**
 * scripts/deps-check.js — 零第三方依赖校验（`just deps:check`）
 * package.json 的 dependencies / devDependencies 必须恒为空对象（AGENTS 红线 #1）。
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const pkg = JSON.parse(readFileSync(resolve(join(import.meta.dirname, '..', 'package.json')), 'utf8'));

const violations = [];
for (const field of ['dependencies', 'devDependencies']) {
  const value = pkg[field] ?? {};
  const names = Object.keys(value);
  if (names.length) violations.push(`${field} 包含第三方依赖: ${names.join(', ')}`);
}

if (violations.length) {
  console.error('[deps:check] 失败：\n' + violations.join('\n'));
  process.exit(1);
}
console.log('[deps:check] 通过：dependencies / devDependencies 均为空');
process.exit(0);