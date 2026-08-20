/**
 * dashboard 模块 API（只通过公共 fetcher 调用既有模块的只读接口，不跨模块 import）。
 */

import { get } from '../../lib/fetcher.js';

/**
 * 汇总概览数据：笔记总数 + 最近 5 条、对话总数 + 最近 5 条。
 * 复用 notes / chat 模块的服务端只读接口（带 Cache-Control，见架构 4.7 节）。
 */
export async function fetchSummary() {
  const [notes, conversations] = await Promise.all([
    get('/api/notes?limit=5'),
    get('/api/chat/conversations?limit=5'),
  ]);
  return {
    notes: { items: notes.items || [], total: notes.total || 0 },
    conversations: { items: conversations.items || [], total: conversations.total || 0 },
  };
}