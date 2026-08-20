/**
 * settings → database 子模块入口：只读数据库信息。
 */

import '../components/database-view.js';
import { loadLocale } from '../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('database-view');
  el.appendChild(view);
  view.load();
}