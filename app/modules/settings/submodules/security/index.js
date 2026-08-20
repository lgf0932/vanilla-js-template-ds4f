/**
 * settings → security 子模块入口：改密 + 会话时长。
 */

import '../../components/security-view.js';
import { loadLocale } from '../../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('security-view');
  el.appendChild(view);
  view.load();
}