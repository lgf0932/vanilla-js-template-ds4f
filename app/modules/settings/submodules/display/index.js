/**
 * settings → display 子模块入口：主题与语言。
 */

import '../components/display-view.js';
import { loadLocale } from '../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('display-view');
  el.appendChild(view);
  view.load();
}