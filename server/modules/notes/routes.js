/**
 * server/modules/notes/routes.js
 * 路由函数只做参数校验 + 调用 service（不写 SQL、不写加解密）。
 * 注意：/api/notes/tags 必须先于 /api/notes/:id 注册（路由按注册顺序匹配）。
 * 只读 GET 设 Cache-Control（private 短缓存），避免每次击穿 DB。
 */

import { readJson, intParam, HttpError } from '../../core/middleware.js';
import * as notesService from './service.js';

/** 统一鉴权下的路由（默认非 public） */
export function registerNotesRoutes(router, app) {
  // ---- 标签（先注册，保证静态段优先匹配） ----
  router.add('GET', '/api/notes/tags', async () => notesService.listTags(app), {
    cacheControl: 'private, max-age=10',
  });
  router.add('POST', '/api/notes/tags', async (ctx) => {
    const body = await readJson(ctx.request);
    return notesService.createTag(app, { name: body.name });
  });
  router.add('DELETE', '/api/notes/tags/:id', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    return notesService.deleteTag(app, id);
  });

  // ---- 笔记 ----
  router.add('GET', '/api/notes', async (ctx) => {
    const { tag = '' } = Object.fromEntries(ctx.query);
    return notesService.listNotes(app, {
      tag,
      search: String(ctx.query.get('search') || ''),
      limit: intParam(ctx.query.get('limit'), 20, { min: 1, max: 100 }),
      offset: intParam(ctx.query.get('offset'), 0),
    });
  }, { cacheControl: 'private, max-age=30' });

  router.add('GET', '/api/notes/:id', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    return notesService.getNote(app, id);
  }, { cacheControl: 'private, max-age=10' });

  router.add('POST', '/api/notes', async (ctx) => {
    const body = await readJson(ctx.request);
    return notesService.createNote(app, { title: body.title, body: body.body, tagIds: body.tagIds });
  });

  router.add('PUT', '/api/notes/:id', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    const body = await readJson(ctx.request);
    return notesService.updateNote(app, id, { title: body.title, body: body.body, tagIds: body.tagIds });
  });

  router.add('DELETE', '/api/notes/:id', async (ctx) => {
    const id = intParam(ctx.params.id, 0, { min: 1 });
    if (!id) throw new HttpError(400, 'BAD_REQUEST');
    return notesService.deleteNote(app, id);
  });
}