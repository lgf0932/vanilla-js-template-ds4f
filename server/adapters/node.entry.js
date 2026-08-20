/**
 * server/adapters/node.entry.js
 * Node.js / Docker 入口（本地开发默认，node:http → 标准 Request/Response）。
 * 提供：/api/* → handleRequest；静态资源（app/ public/）；SPA fallback → index.html。
 * 启动时自动执行数据库迁移（createApp 内 ensureMigrated）。
 *
 * 直接运行：node server/adapters/node.entry.js（环境变量 PORT，默认 8787；绑定 0.0.0.0）
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRequest, createApp } from '../app.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function serveStatic(pathname) {
  let clean = decodeURIComponent(pathname);
  if (clean === '/') clean = '/index.html';
  // 防目录穿越
  if (clean.split('/').includes('..')) return null;
  const filePath = resolve(join(ROOT, clean));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) return null;
  if (!existsSync(filePath) || !(await readFile(filePath).catch(() => null))) return null;
  const content = await readFile(filePath);
  return new Response(content, {
    headers: {
      'content-type': MIME[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'public, max-age=60',
    },
  });
}

/** 把 Node req/res 转成标准 Request → handleRequest → 写回 */
export async function nodeFetchHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 缓冲请求体（Node IncomingMessage → Request body）
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const request = new Request(url, { method: req.method, headers: req.headers, body });

  let response;
  if (url.pathname.startsWith('/api/')) {
    response = await handleRequest(request, process.env);
  } else {
    response = (await serveStatic(url.pathname)) || (await indexFallback());
  }

  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk);
  }
  res.end();
}

async function indexFallback() {
  const html = await readFile(join(ROOT, 'index.html'));
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

/** 启动 HTTP 服务（默认 0.0.0.0:PORT/8787） */
export async function startServer({ port = Number(process.env.PORT) || 8787, host = '0.0.0.0' } = {}) {
  // 启动即迁移 + 校验配置（如 ENCRYPTION_KEY 缺失会在首次加密时抛错，这里先冒烟）
  await createApp(process.env);

  const server = createServer(nodeFetchHandler);
  server.listen(port, host, () => {
    console.log(`[nova] server ready at http://${host}:${port} (db: ${process.env.DB_DRIVER || 'auto'})`);
  });
  return server;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startServer().catch((err) => {
    console.error('[nova] failed to start:', err);
    process.exit(1);
  });
}