/**
 * settings 模块根入口：/settings → 默认子模块（profile）。
 */

import { router } from '../../core/router.js';
import { loadLocale } from './locale.js';

export { loadLocale };

export function mount(el, ctx) {
  const first = ctx.manifest.submodules?.[0]?.id || 'profile';
  router.navigate(`/${ctx.manifest.id}/${first}`, { replace: true });
}