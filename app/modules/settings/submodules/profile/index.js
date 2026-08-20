/**
 * settings → profile 子模块入口：用户资料（敏感字段服务端加密）。
 */

import '../../components/profile-view.js';
import { loadLocale } from '../../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('profile-view');
  el.appendChild(view);
  view.load();
}