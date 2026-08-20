/**
 * chat 模块入口。
 */

import './components/chat-view.js';
import { store } from './store.js';
import { loadLocale } from './locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('chat-view');
  el.appendChild(view);
  view.load();
}

export { store };