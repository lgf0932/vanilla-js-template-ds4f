/**
 * scripts/build.js — 生产构建（`just build`，无打包器）
 * 产出 dist/（可直接静态托管）：
 *  - 复制 index.html / app/ / public/（保留目录结构与动态 import 相对路径不变）
 *  - index.html 的静态引用（css ×4 + bootstrap.js）追加 ?v=<hash> 查询指纹（缓存失效）
 *  - 极简"手写压缩"：仅剔除注释行/行尾空白/折叠空行，不做任何语义变更
 */

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const ROOT = resolve(join(import.meta.dirname, '..'));
const DIST = join(ROOT, 'dist');

const COPY_ITEMS = ['index.html', 'app', 'public', 'shared'];

function hash8(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/**
 * 极简压缩（不改变语义）：
 *  - .js：删除整行注释（// 行注释、JSDoc 块的行）
 *  - .css：删除单行块注释（首尾同行的 /星 注释）
 *  - 全部：行尾空白、折叠连续空行
 * 安全边界：css 通用选择器行 `*,` 不删（只删 `* ` 后跟空格的行，即 JSDoc 行）。
 */
function minify(source, ext) {
  return source
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      if (ext === '.js') {
        if (t.startsWith('//')) return '';
        if (t.startsWith('/*') || t.startsWith('*/') || t === '*' || t.startsWith('* ')) return '';
      }
      if (ext === '.css') {
        if (/^\/\*.*\*\/$/.test(t)) return '';
      }
      return line.trimEnd();
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

async function main() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  for (const item of COPY_ITEMS) {
    cpSync(join(ROOT, item), join(DIST, item), { recursive: true });
  }

  // 测试文件只属于源码校验，不应进入生产静态产物（否则 node --test 会重复扫描 dist）。
  for (const file of walk(DIST)) {
    if (file.endsWith('.test.js')) rmSync(file);
  }

  // 压缩 JS/CSS（保留文件路径不变 → 动态 import 相对路径继续有效）
  for (const file of walk(DIST)) {
    if (!/\.(js|css)$/.test(file)) continue;
    const ext = file.slice(file.lastIndexOf('.'));
    const content = readFileSync(file, 'utf8');
    writeFileSync(file, minify(content, ext));
  }

  // 指纹化静态引用（仅 index.html 中显式 href/src 的 /app /public 资源）
  const indexPath = join(DIST, 'index.html');
  const html = readFileSync(indexPath, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="(\/(?:app|public)\/[^"]+)"/g)].map((m) => m[1]);
  let next = html;
  for (const ref of refs) {
    const file = join(DIST, ref);
    const content = readFileSync(file, 'utf8');
    const fingerprinted = ref.includes('?') ? ref : `${ref}?v=${hash8(content)}`;
    next = next.split(ref).join(fingerprinted);
  }
  writeFileSync(indexPath, next.replace(/\s+/g, ' ').replace(/></g, '>\n<'));

  const size = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;
  let total = 0;
  for (const file of walk(DIST)) total += statSync(file).size;
  console.log(`[build] dist/ 完成（共 ${size(total)}），文件结构与动态 import 路径保持不变`);
}

main().catch((err) => {
  console.error('[build] 失败:', err);
  process.exit(1);
});