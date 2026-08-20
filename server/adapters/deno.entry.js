/**
 * server/adapters/deno.entry.js
 * Deno Deploy 入口：Deno.serve → handleRequest（env 取自 Deno.env）。
 * 静态资源由 Deno 内置静态文件服务或 CDN 承载；本文件处理 /api/*，其它路径返回 index.html（SPA）。
 *
 * 运行：deno run --allow-net --allow-read --allow-env server/adapters/deno.entry.js
 */

import { handleRequest } from '../app.js';

function denoEnv() {
  const env = { NODE_ENV: 'production', ...Deno.env.toObject() };
  return env;
}

async function serveStatic(pathname) {
  if (pathname.includes('..')) return null;
  const candidates = pathname === '/' ? ['/index.html'] : [pathname];
  for (const p of candidates) {
    try {
      const bytes = await Deno.readFile(`.${p}`);
      const type = MIME[p.split('.').pop()] || 'application/octet-stream';
      return new Response(bytes, { headers: { 'content-type': type } });
    } catch {
      /* continue */
    }
  }
  return null;
}

const MIME = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

Deno.serve(async (request) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    return handleRequest(request, denoEnv());
  }
  const staticRes = await serveStatic(url.pathname);
  if (staticRes) return staticRes;
  // SPA fallback
  const html = await Deno.readFile('./index.html');
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
});