/**
 * server/modules/settings/routes.js
 * 全部路由默认鉴权（X-Auth-Password），无公开路由；路由函数只做参数校验 + 调用 service。
 */

import { readJson, json } from '../../core/middleware.js';
import * as settingsService from './service.js';

export function registerSettingsRoutes(router, app) {
  // ---- 用户资料（敏感字段，服务端 AES-GCM 加密落库） ----
  router.add('GET', '/api/settings/profile', async () => settingsService.getProfile(app), {
    cacheControl: 'private, max-age=5',
  });
  router.add('PUT', '/api/settings/profile', async (ctx) => {
    const body = await readJson(ctx.request);
    return settingsService.updateProfile(app, body.profile);
  });

  // ---- 显示设置（主题 / 语言） ----
  router.add('GET', '/api/settings/display', async () => settingsService.getDisplay(app), {
    cacheControl: 'private, max-age=5',
  });
  router.add('PUT', '/api/settings/display', async (ctx) => {
    const body = await readJson(ctx.request);
    return settingsService.updateDisplay(app, { theme: body.theme, language: body.language });
  });

  // ---- 安全 ----
  router.add('POST', '/api/settings/security/change-password', async (ctx) => {
    const body = await readJson(ctx.request);
    return settingsService.changePassword(app, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
  });
  router.add('GET', '/api/settings/security/session', async () => settingsService.getSessionDefault(app), {
    cacheControl: 'private, max-age=5',
  });
  router.add('PUT', '/api/settings/security/session', async (ctx) => {
    const body = await readJson(ctx.request);
    return settingsService.updateSessionDefault(app, { duration: body.duration });
  });

  // ---- 数据库信息（只读） ----
  router.add('GET', '/api/settings/database', async () => settingsService.databaseInfo(app), {
    cacheControl: 'private, max-age=10',
  });
}

export { json };