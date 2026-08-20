import { define, attachTemplate, qs, escapeHtml } from '../../../components/ui/base.js';
import { i18n, t } from '../../../core/i18n.js';
import { store, setFilter, toggleConnection, visibleApps } from '../store.js';

class AppsView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._search = qs(this.shadowRoot, '.search');
    this._type = qs(this.shadowRoot, '.type');
    this._sort = qs(this.shadowRoot, '.sort');
    this._type.options = [
      { value: 'all', label: t('apps.type.all') },
      { value: 'connected', label: t('apps.type.connected') },
      { value: 'notConnected', label: t('apps.type.notConnected') },
    ];
    this._sort.options = [
      { value: 'asc', label: t('apps.sort.asc') },
      { value: 'desc', label: t('apps.sort.desc') },
    ];
    this._search.addEventListener('input', (event) => setFilter({ term: event.detail.value }));
    this._type.addEventListener('change', (event) => setFilter({ type: event.detail.value }));
    this._sort.addEventListener('change', (event) => setFilter({ sort: event.detail.value }));
    this._unsubscribe = store.subscribe(() => this.render());
    this._unsubscribeI18n = i18n.onChange(() => this._refreshOptions());
    this._refreshOptions();
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribeI18n?.();
  }

  _refreshOptions() {
    if (!this._type) return;
    this._search.setAttribute('placeholder', t('apps.filterPlaceholder'));
    this._type.options = [
      { value: 'all', label: t('apps.type.all') },
      { value: 'connected', label: t('apps.type.connected') },
      { value: 'notConnected', label: t('apps.type.notConnected') },
    ];
    this._sort.options = [
      { value: 'asc', label: t('apps.sort.asc') },
      { value: 'desc', label: t('apps.sort.desc') },
    ];
    const state = store.getState();
    this._type.value = state.type;
    this._sort.value = state.sort;
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    const state = store.getState();
    this._search.value = state.term;
    this._type.value = state.type;
    this._sort.value = state.sort;
    const list = visibleApps(i18n.lang, t);
    qs(this.shadowRoot, '.empty').hidden = list.length > 0;
    const grid = qs(this.shadowRoot, '.grid');
    grid.innerHTML = list.map((app) => `
      <article class="app-card">
        <div class="card-top"><span class="app-icon"><ui-icon name="${escapeHtml(app.icon)}" size="lg"></ui-icon></span>
          <button type="button" class="connect ${app.isConnected ? 'connected' : ''}" data-connect="${app.id}">${escapeHtml(app.isConnected ? t('apps.connected') : t('apps.connect'))}</button>
        </div>
        <h2>${escapeHtml(app.name)}</h2><p>${escapeHtml(app.description)}</p>
      </article>`).join('');
    for (const button of grid.querySelectorAll('[data-connect]')) {
      button.addEventListener('click', () => toggleConnection(button.dataset.connect));
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .heading h1 { font-size: var(--text-2xl); font-weight: 700; }
  .heading p { margin-top: var(--spacing-1); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
  .toolbar { display: flex; align-items: end; justify-content: space-between; gap: var(--spacing-3); flex-wrap: wrap; border-bottom: 1px solid hsl(var(--border)); padding-bottom: var(--spacing-3); }
  .filters { display: flex; gap: var(--spacing-2); flex-wrap: wrap; }
  .search { width: min(16rem, 100%); }
  .type { width: 10rem; }
  .sort { width: 10rem; }
  .grid { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: var(--spacing-3); }
  .app-card { display: grid; gap: var(--spacing-2); padding: var(--spacing-4); background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out); }
  .app-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .card-top { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); margin-bottom: var(--spacing-4); }
  .app-icon { display: inline-flex; align-items: center; justify-content: center; width: var(--spacing-10); height: var(--spacing-10); border-radius: var(--radius-lg); background: hsl(var(--muted)); color: hsl(var(--foreground)); }
  .connect { padding: var(--spacing-2) var(--spacing-3); border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--background)); color: hsl(var(--foreground)); cursor: pointer; font-size: var(--text-xs); font-weight: 500; }
  .connect:hover, .connect.connected { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
  .connect.connected { border-color: hsl(var(--primary) / .35); }
  h2 { font-size: var(--text-base); font-weight: 600; }
  .app-card p { min-height: var(--spacing-8); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
  .empty { margin: 0; }
  @media (min-width: 40rem) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 64rem) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
<div class="page"><header class="heading"><h1>${escapeHtml(t('apps.title'))}</h1><p>${escapeHtml(t('apps.desc'))}</p></header><div class="toolbar"><div class="filters"><ui-input class="search" type="search"></ui-input><ui-select class="type"></ui-select></div><ui-select class="sort"></ui-select></div><div class="grid"></div><ui-empty class="empty" icon="package" title="${escapeHtml(t('apps.empty'))}" description="${escapeHtml(t('apps.emptyHint'))}"></ui-empty></div>
`;

define('apps-view', AppsView);