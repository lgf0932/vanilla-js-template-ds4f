/**
 * app/components/ui/ui-radio-group.js
 * <ui-radio-group label="..." orientation="vertical|horizontal">
 * 用法：el.options = [{value,label,description?}]; el.value = 'x'; 监听 change。
 * 键盘：↑↓/←→ 移动，空格选中。
 */

import { define, attachTemplate, qs, qsa, emit } from './base.js';

class UiRadioGroup extends HTMLElement {
  static observedAttributes = ['label', 'orientation', 'name'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._options = [];
    this.render();

    const list = qs(this.shadowRoot, '[role="radiogroup"]');
    list.addEventListener('keydown', (e) => {
      const items = qsa(list, '[role="radio"]');
      const idx = this._activeIndex(items);
      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = items[(idx + 1) % items.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = items[(idx - 1 + items.length) % items.length];
      if (next) {
        e.preventDefault();
        this._focusItem(items, items.indexOf(next));
      }
      if (e.key === ' ') {
        e.preventDefault();
        const current = items[idx];
        if (current) this.value = current.dataset.value;
      }
    });
  }

  get label() {
    return this.getAttribute('label') || '';
  }

  get orientation() {
    return this.getAttribute('orientation') || 'vertical';
  }

  get value() {
    return this._value ?? '';
  }

  set value(v) {
    this._value = v ?? '';
    this.render();
    emit(this, 'change', { value: this._value });
  }

  set options(list) {
    this._options = list || [];
    this.render();
  }

  get options() {
    return this._options;
  }

  _activeIndex(items) {
    const i = items.findIndex((o) => o.dataset.value === this._value);
    return i >= 0 ? i : 0;
  }

  _focusItem(items, i) {
    items.forEach((o, n) => {
      o.classList.toggle('focused', n === i);
      o.tabIndex = n === i ? 0 : -1;
    });
    items[i]?.focus();
  }

  render() {
    if (!this.shadowRoot) return;
    const wrap = qs(this.shadowRoot, '.radio-wrap');
    const label = qs(this.shadowRoot, '.label');
    if (!wrap || !label) return;
    label.textContent = this.label;
    label.hidden = !this.label;
    wrap.classList.toggle('vertical', this.orientation === 'vertical');

    const list = qs(this.shadowRoot, '[role="radiogroup"]');
    list.innerHTML = this._options
      .map(
        (o, i) => `
        <div class="radio-row" role="radio" data-value="${String(o.value).replace(/"/g, '&quot;')}" tabindex="${o.value === this._value ? 0 : -1}" aria-checked="${o.value === this._value}">
          <span class="dot"></span>
          <span class="copy">
            <span class="opt-label">${o.label || o.value}</span>
            ${o.description ? `<span class="opt-desc">${o.description}</span>` : ''}
          </span>
        </div>`,
      )
      .join('');

    for (const row of qsa(list, '.radio-row')) {
      row.addEventListener('click', () => {
        this.value = row.dataset.value;
      });
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; }
  .label { display: block; font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--spacing-2); }
  .label[hidden] { display: none; }
  [role="radiogroup"] { display: grid; gap: var(--spacing-1); }
  .radio-wrap:not(.vertical) [role="radiogroup"] { grid-auto-flow: column; grid-auto-columns: max-content; }
  .radio-row {
    display: flex; align-items: flex-start; gap: var(--spacing-2); cursor: pointer;
    padding: var(--spacing-2); border-radius: var(--radius); border: 1px solid transparent;
    transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
  }
  .radio-row:hover { background: hsl(var(--accent)); }
  .radio-row.focused { border-color: hsl(var(--ring)); }
  .dot {
    flex: none; width: 1rem; height: 1rem; margin-top: .125rem; border-radius: var(--radius-full);
    border: 2px solid hsl(var(--input)); background: hsl(var(--background));
    transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
  }
  .radio-row[aria-checked="true"] .dot {
    border-color: hsl(var(--primary));
    box-shadow: inset 0 0 0 3px hsl(var(--background));
    background: hsl(var(--primary));
  }
  .copy { display: grid; gap: var(--spacing-1); }
  .opt-label { font-size: var(--text-sm); font-weight: 500; }
  .opt-desc { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
</style>
<div class="radio-wrap">
  <span class="label" part="label"></span>
  <div role="radiogroup" aria-label=""></div>
</div>
`;

define('ui-radio-group', UiRadioGroup);