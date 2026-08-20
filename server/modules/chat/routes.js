/**
 * server/modules/chat/routes.js
 * 全部路由默认鉴权；路由只做参数校验 + 调用 service。
 */

import { readJson, intParam, HttpError } from '../../core/middleware.js';
import * as chatService from './service.js';

export function registerChatRoutes(router, app) {
  router.add('GET', '/api/chat/conversations', async (ctx) => {
    return chatService.listConversations(app, {
      limit: intParam(ctx.query.get('limit'), 50, { min: 1, max: 100 }),
      offset: intParam(ctx.query.get('offset'), 0),
    });
  }, { cacheControl: 'private, max-age=15' });

  router.add('POST', '/api/chat/conversations', async (ctx) => {
    const body = await readJson(ctx.request);
    return chatService.createConversation(app, { title: body.title });
  });

  router.add('POST', '/api/chat/conversations/:id', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    const body = await readJson(ctx.request);
    return chatService.renameConversation(app, id, { title: body.title });
  });

  router.add('DELETE', '/api/chat/conversations/:id', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    return chatService.deleteConversation(app, id);
  });

  router.add('GET', '/api/chat/conversations/:id/messages', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    return chatService.listMessages(app, id);
  }, { cacheControl: 'private, max-age=10' });

  router.add('POST', '/api/chat/conversations/:id/messages', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    const body = await readJson(ctx.request);
    return chatService.sendMessage(app, id, { role: body.role, content: body.content });
  });
}