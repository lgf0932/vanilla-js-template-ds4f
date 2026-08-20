import { readJson } from '../../core/middleware.js';
import * as chatsService from './service.js';

export function registerChatsRoutes(router, app) {
  router.add('GET', '/api/chats/config', async () => chatsService.getConfig(app), { cacheControl: 'private, max-age=10' });
  router.add('PUT', '/api/chats/config', async (ctx) => chatsService.saveConfig(app, await readJson(ctx.request)), { cacheControl: 'no-store' });
  router.add('GET', '/api/chats/providers', async () => chatsService.providers(app), { cacheControl: 'private, max-age=60' });
  router.add('POST', '/api/chats/stream', async (ctx) => chatsService.streamChat(app, await readJson(ctx.request), ctx.request));
}