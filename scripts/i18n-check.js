/**
 * scripts/i18n-check.js — 三语言文案 key 一致性校验（`just i18n:check`）
 * 扫描 app/locales 以及 app/modules 下各模块的 locales 目录（子模块复用父模块语言包）：
 * 每个 locale 目录必须恰好包含 zh-CN / zh-TW / en 三份 JSON，且 key 集合完全一致。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const ROOT = resolve(join(import.meta.dirname, '..'));
const LANGS = ['zh-CN', 'zh-TW', 'en'];

function collectKeys(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) collectKeys(value, path, out);
    else out.add(path);
  }
  return out;
}

function findLocaleDirs(base, out = []) {
  for (const entry of readdirSync(base)) {
    if (entry.startsWith('.')) continue;
    const full = join(base, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'locales') out.push(full);
      else findLocaleDirs(full, out);
    }
  }
  return out;
}

let failed = false;

function checkDir(dir) {
  const rel = dir.length > ROOT.length ? dir.slice(ROOT.length + 1) : dir;
  const existing = readdirSync(dir).filter((f) => f.endsWith('.json'));

  const missing = LANGS.filter((l) => !existing.includes(`${l}.json`));
  const extra = existing.filter((f) => !LANGS.includes(f.replace(/\.json$/, '')));
  if (missing.length || extra.length) {
    console.error(`✗ ${rel}: 文件缺失 [${missing.join(', ')}] 或多余 [${extra.join(', ')}]`);
    failed = true;
    return;
  }

  const packs = {};
  for (const lang of LANGS) {
    packs[lang] = collectKeys(JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')));
  }

  const master = packs['zh-CN'];
  for (const lang of LANGS) {
    if (lang === 'zh-CN') continue;
    const missingKeys = [...master].filter((k) => !packs[lang].has(k));
    const extraKeys = [...packs[lang]].filter((k) => !master.has(k));
    if (missingKeys.length || extraKeys.length) {
      console.error(`✗ ${rel}/${lang}.json: 缺失 [${missingKeys.join(', ')}] 多余 [${extraKeys.join(', ')}]`);
      failed = true;
    }
  }
}

findLocaleDirs(join(ROOT, 'app')).forEach(checkDir);

if (failed) {
  console.error('\n[i18n:check] 失败：请同步补齐三语言文案（AGENTS.md 第 7 节）');
  process.exit(1);
}
console.log('[i18n:check] 通过：全部 locale 目录三语言 key 一致');
process.exit(0);