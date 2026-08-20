/**
 * app/components/ui/ui-tabs.js
 * <ui-tabs items='[{"id":"a","label":"A"}]' active="a">  +  具名 slot tab-a / tab-b ...
 * 键盘：←→ 切换 Tab，Home/End 首尾。
 */

import { define, attachTemplate, qs, qsa, emit } from './base.js';

class UiTabs extends HTMLElement {
  static observedAttributes = ['items', 'active'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    this._items = [];
    this.shadowRoot.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
      const tabs = qsa(this.shadowRoot, '[role="tab"]');
      const idx = this._items.findIndex((t) => t.id === this.active);
      const current = idx < 0 ? 0 : idx;
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        const id = this._items[next]?.id;
        if (id) this.setActive(id);
        tabs[next]?.focus();
      }
    });

    this.render();
  }

  attributeChangedCallback(name) {
    if (name === 'items' || name === 'active') {
      try {
        this._items = JSON.parse(this.getAttribute('items') || '[]');
      } catch {
        this._items = [];
      }
      this.render();
    }
  }

  get active() {
    return this.getAttribute('active') || this._items?.[0]?.id || '';
  }

  setActive(id) {
    this.setAttribute('active', id);
    emit(this, 'change', { id });
  }

  render() {
    if (!this.shadowRoot) return;
    const tablist = qs(this.shadowRoot, '[role="tablist"]');
    if (!tablist) return;
    const items = this._items || [];

    tablist.innerHTML = items
      .map(
        (t) => `
        <button type="button" role="tab" data-id="${String(t.id).replace(/"/g, '&quot;')}"
          aria-selected="${t.id === this.active}">${t.label}</button>`,
      )
      .join('');

    for (const btn of qsa(tablist, '[role="tab"]')) {
      btn.addEventListener('click', () => this.setActive(btn.dataset.id));
      btn.classList.toggle('active', btn.dataset.id === this.active);
      btn.tabIndex = btn.dataset.id === this.active ? 0 : -1;
    }

    // 面板：具名 slot tab-<id>，仅激活面板可见
    const panels = qs(this.shadowRoot, '.panels');
    panels.innerHTML = items
      .map((t) => `<div class="panel" data-panel="${String(t.id).replace(/"/g, '&quot;')}"><slot name="tab-${String(t.id).replace(/"/g, '&quot;')}"></slot></div>`)
      .join('');
    for (const panel of qsa(panels, '.panel')) {
      panel.hidden = panel.dataset.panel !== this.active;
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; }
  .tabs { display: flex; gap: var(--spacing-1); border-bottom: 1px solid hsl(var(--border)); overflow-x: auto; }
  [role="tab"] {
    appearance: none; background: transparent; border: 0; border-bottom: 2px solid transparent;
    padding: var(--spacing-2) var(--spacing-3); font-size: var(--text-sm); font-weight: 500;
    color: hsl(var(--muted-foreground)); cursor: pointer; white-space: nowrap;
    transition: color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
  }
  [role="tab"]:hover { color: hsl(var(--foreground)); }
  [role="tab"].active { color: hsl(var(--foreground)); border-bottom-color: hsl(var(--primary)); }
  .panels { padding-top: var(--spacing-3); }
  .panel[hidden] { display: none; }
</style>
<div class="tabs" role="tablist"></div>
<div class="panels"></div>
`;

define('ui-tabs', UiTabs);