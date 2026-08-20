/**
 * scripts/dev-server.js — 本地开发服务器（`just dev`）
 *  - 若存在 .env 则手动解析注入 process.env（零依赖实现，不覆盖已有变量）
 *  - 启动 server/adapters/node.entry.js（Node 适配器 + SQLite，原生 ESM 不打包）
 */

import { existsSync, readFileSync } from 'node:fs';
import { startServer } from '../server/adapters/node.entry.js';

function loadDotEnv() {
  if (!existsSync('.env')) return;
  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

startServer().catch((err) => {
  console.error('[nova] 启动失败:', err.message);
  process.exit(1);
});