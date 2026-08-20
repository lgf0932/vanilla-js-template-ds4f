/**
 * notes-tags 子模块入口：标签管理视图。
 */

import '../../components/notes-tags.js';
import { loadLocale } from '../../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('notes-tags-view');
  el.appendChild(view);
  view.load();
}