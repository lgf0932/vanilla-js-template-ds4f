/**
 * api/server.js — Vercel Functions 入口壳
 * vercel.json 将 /api/(.*) rewrite 到此，真正的业务入口见 server/adapters/vercel.entry.js。
 * 如此 adpater 层保持纯胶水，不在 /api 目录里复制逻辑。
 */
export { default } from '../server/adapters/vercel.entry.js';