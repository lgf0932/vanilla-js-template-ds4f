/**
 * notes 模块根入口。
 * /notes 本身不渲染内容，落到默认子模块（列表，不留空白页）。
 */

import { router } from '../../core/router.js';
import { loadLocale } from './locale.js';

export { loadLocale };

export function mount(el, ctx) {
  const first = ctx.manifest.submodules?.[0]?.id || 'list';
  router.navigate(`/${ctx.manifest.id}/${first}`, { replace: true });
}