import '../../components/docs-page.js';
import { loadLocale } from '../../locale.js';

export { loadLocale };

export function mount(el) {
  const view = document.createElement('docs-page');
  view.setAttribute('page', 'tutorials');
  el.appendChild(view);
}