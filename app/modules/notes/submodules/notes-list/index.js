/**
 * notes-list 子模块入口：笔记列表视图。
 */

import '../components/notes-list.js';
import { loadLocale } from '../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('notes-list-view');
  el.appendChild(view);
  view.load();
}