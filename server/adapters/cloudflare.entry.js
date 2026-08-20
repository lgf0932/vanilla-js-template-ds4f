/**
 * server/adapters/cloudflare.entry.js
 * Cloudflare Pages Functions / Workers 入口。
 *  - /api/* → handleRequest(request, env)（env 自带 DB 绑定 → 自动选型 D1）
 *  - 静态资源由 Pages 内置托管（本函数不处理非 /api 路径，直接 404 由 Pages 兜底）
 *
 * 部署：npx wrangler@3 deploy（wrangler.toml 声明 D1 绑定，默认名 DB）
 */

import { handleRequest } from '../app.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      // Pages 静态资源由平台提供；这里仅标记未命中的路径
      return new Response('Not found', { status: 404 });
    }
    return handleRequest(request, env);
  },
};

export { handleRequest };