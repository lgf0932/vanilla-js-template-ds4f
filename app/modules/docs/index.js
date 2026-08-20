/** docs 根入口：进入 /docs 时落到简介，避免空白根页面。 */
import { router } from '../../core/router.js';
import { loadLocale } from './locale.js';

export { loadLocale };

export function mount(el, ctx) {
  const first = ctx.manifest.submodules?.[0]?.id || 'introduction';
  router.navigate(`/${ctx.manifest.id}/${first}`, { replace: true });
}