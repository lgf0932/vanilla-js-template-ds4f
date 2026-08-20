/**
 * server/adapters/cloudflare.entry.js
 * Cloudflare Pages Functions / Workers 入口。
 *  - /api/* → handleRequest(request, env)（env 自带 DB 绑定 → 自动选型 D1）
 *  - 其它路径 → Workers Assets（ASSETS binding）+ index.html SPA fallback
 *
 * 部署：npx wrangler@latest deploy（wrangler.toml 声明 D1 与 Assets 绑定）
 */

import { handleRequest } from '../app.js';

async function serveAssets(request, env) {
  const assets = env.ASSETS;
  if (!assets || typeof assets.fetch !== 'function') {
    return new Response('Static assets binding not configured', { status: 500 });
  }

  const asset = await assets.fetch(request);
  if (asset.status !== 404 || !['GET', 'HEAD'].includes(request.method)) return asset;

  // Client-side routes such as /notes/list need the SPA shell on refresh.
  const fallbackUrl = new URL('/index.html', request.url);
  return assets.fetch(new Request(fallbackUrl, {
    method: request.method,
    headers: request.headers,
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleRequest(request, env);
    return serveAssets(request, env);
  },
};

export { handleRequest, serveAssets };
