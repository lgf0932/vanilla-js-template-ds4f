/**
 * server/adapters/vercel.entry.js
 * Vercel 入口（Edge/NODE Runtime 均可，标准 Request → Response）。
 * 实际部署入口是 api/server.js（vercel.json 中 rewrite 到 /api/server）。
 */

import { handleRequest } from '../app.js';

export default async function handler(request) {
  return handleRequest(request, process.env);
}

export { handleRequest };