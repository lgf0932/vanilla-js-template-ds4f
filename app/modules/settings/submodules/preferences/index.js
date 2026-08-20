/** Settings 偏好页共享入口：按子路由 id 选择对应页面。 */

import '../../components/preferences-view.js';
import { loadLocale } from '../../locale.js';

export { loadLocale };

export function mount(el, ctx) {
  const view = document.createElement('preferences-view');
  view.setAttribute('page', ctx.sub?.id || 'account');
  el.appendChild(view);
}
