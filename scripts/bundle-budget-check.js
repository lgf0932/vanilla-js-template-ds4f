/**
 * scripts/bundle-budget-check.js — 体积预算校验（`just build:budget`，ARCHITECTURE.md 4.8 节）
 *
 * | 指标                     | 预算       |
 * |--------------------------|-----------|
 * | 首屏 JS（gzip）          | ≤ 40KB    |
 * | 单模块增量 chunk（gzip） | ≤ 15KB    |
 * | 首屏关键 CSS（gzip）     | ≤ 8KB     |
 *
 * 统计口径（Zero-Build 保持文件粒度）：
 *  - 首屏 JS = app/core + app/lib + app/components/layout + app/components/ui + 一份壳层语言包
 *  - 模块 chunk = app/modules/<id>/**（JS+语言包）
 *  - 首屏 CSS = app/styles/**
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(join(import.meta.dirname, '..'));
const DIST = join(ROOT, 'dist');

const BUDGETS = [
  { name: '首屏 JS（gzip）', limitKB: 40, fallback: '≤ 40KB' },
  { name: '单模块 chunk（gzip）', limitKB: 15, fallback: '≤ 15KB' },
  { name: '首屏关键 CSS（gzip）', limitKB: 8, fallback: '≤ 8KB' },
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function gzKB(files) {
  let bytes = 0;
  for (const f of files) bytes += gzipSync(readFileSync(f)).length;
  return bytes / 1024;
}

function moduleChunks() {
  const modulesDir = join(DIST, 'app', 'modules');
  const result = [];
  for (const id of readdirSync(modulesDir).filter((d) => statSync(join(modulesDir, d)).isDirectory())) {
    result.push({ id, kb: gzKB(walk(join(modulesDir, id))) });
  }
  return result;
}

function main() {
  if (!existsSync(DIST)) {
    spawnSync(process.execPath, [join(ROOT, 'scripts', 'build.js')], { stdio: 'inherit' });
  }

  const dir = (p) => join(DIST, 'app', p);
  const coreJS = [
    ...walk(dir('core')),
    ...walk(dir('lib')),
    ...walk(dir('components/layout')),
    ...walk(dir('components/ui')),
    ...walk(dir('locales')).filter((f) => f.includes('zh-CN')),
  ].filter((f) => f.endsWith('.js'));
  const css = walk(dir('styles'));

  const coreKB = gzKB(coreJS);
  const cssKB = gzKB(css);
  const chunks = moduleChunks();

  let failed = false;
  const report = [];

  report.push(`首屏 JS:   ${coreKB.toFixed(1)}KB (预算 ${BUDGETS[0].fallback})${coreKB > 40 ? '  ✗' : ''}`);
  report.push(`关键 CSS:  ${cssKB.toFixed(1)}KB (预算 ${BUDGETS[2].fallback})${cssKB > 8 ? '  ✗' : ''}`);

  for (const { id, kb } of chunks) {
    report.push(`模块 ${id}: ${kb.toFixed(1)}KB (预算 ${BUDGETS[1].fallback})${kb > 15 ? '  ✗' : ''}`);
    if (kb > 15) failed = true;
  }
  if (coreKB > 40 || cssKB > 8) failed = true;

  console.log('[build:budget] 体积报告（gzip）：\n  ' + report.join('\n  '));
  if (failed) {
    console.error('[build:budget] 失败：超出体积预算（AGENTS.md 第 8 节）');
    process.exit(1);
  }
  console.log('[build:budget] 通过：全部在预算内');
  process.exit(0);
}

main();