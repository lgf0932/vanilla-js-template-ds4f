/**
 * app/components/ui/ui-select.js
 * <ui-select label="..." [placeholder] [disabled]>  —  自研下拉，替代原生 <select> 默认视觉。
 * 用法：el.options = [{value,label}]; el.value = 'x'; 监听 change，detail={value}。
 * 键盘可达：Enter/空格展开，↑↓ 移动，Enter 选中，Esc 关闭，Tab 移出自动关闭。
 */

import { define, attachTemplate, qs, qsa, emit } from './base.js';

class UiSelect extends HTMLElement {
  static observedAttributes = ['label', 'placeholder', 'disabled', 'name'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._options = [];
    this.render();

    const trigger = qs(this.shadowRoot, '.trigger');
    trigger.addEventListener('click', () => {
      if (this.disabled) return;
      this.open ? this.close() : this.openPopup();
    });

    // 点击外部关闭
    this._outsideHandler = (e) => {
      if (!this.contains(e.target)) this.close();
    };
    document.addEventListener('mousedown', this._outsideHandler);

    this._keyHandler = (e) => this._onKey(e);
    trigger.addEventListener('keydown', this._keyHandler);
    this.addEventListener('keydown', this._keyHandler);
  }

  disconnectedCallback() {
    document.removeEventListener('mousedown', this._outsideHandler);
  }

  get label() {
    return this.getAttribute('label') || '';
  }

  get placeholder() {
    return this.getAttribute('placeholder') || '';
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  get value() {
    return this._value ?? '';
  }

  set value(v) {
    this._value = v ?? '';
    this.render();
  }

  get open() {
    return this.shadowRoot?.querySelector('.listbox')?.classList.contains('open') ?? false;
  }

  set options(list) {
    this._options = list || [];
    this.render();
  }

  get options() {
    return this._options;
  }

  /** 当前选项对象 */
  get selectedOption() {
    return this._options.find((o) => o.value === this.value) || null;
  }

  openPopup() {
    const listbox = qs(this.shadowRoot, '.listbox');
    if (!listbox) return;
    listbox.classList.add('open');
    qs(this.shadowRoot, '.trigger')?.setAttribute('aria-expanded', 'true');
    const active = listbox.querySelector(`[data-value="${CSS.escape(String(this.value))}"]`)
      || listbox.querySelector('.option');
    active?.scrollIntoView({ block: 'nearest' });
  }

  close() {
    const listbox = qs(this.shadowRoot, '.listbox');
    if (listbox) listbox.classList.remove('open');
    qs(this.shadowRoot, '.trigger')?.setAttribute('aria-expanded', 'false');
  }

  _onKey(e) {
    const options = qsa(this.shadowRoot, '.option');
    if (!options.length) return;
    const idx = () => options.findIndex((o) => o.classList.contains('active'));

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!this.open) {
        this.openPopup();
        if (e.key === 'Enter') return;
      }
      const i = idx();
      if (i >= 0) this._select(options[i].dataset.value);
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && this.open) {
      e.preventDefault();
      let i = idx();
      i = e.key === 'ArrowDown' ? (i + 1) % options.length : (i - 1 + options.length) % options.length;
      options.forEach((o, n) => o.classList.toggle('active', n === i));
      options[i]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Escape') {
      this.close();
    }
  }

  _select(newValue) {
    this._value = newValue;
    this.close();
    this.render();
    emit(this, 'change', { value: newValue });
  }

  render() {
    if (!this.shadowRoot) return;
    const listbox = qs(this.shadowRoot, '.listbox');
    const trigger = qs(this.shadowRoot, '.trigger');
    if (!listbox || !trigger) return;

    const current = this._options.find((o) => o.value === this.value);
    trigger.querySelector('.value').textContent = current?.label || this.placeholder;
    trigger.querySelector('.value').classList.toggle('muted', !current);
    trigger.classList.toggle('disabled', this.disabled);
    trigger.setAttribute('aria-expanded', 'false');

    listbox.innerHTML = this._options.length
      ? this._options
          .map(
            (o) =>
              `<button type="button" class="option ${o.value === this.value ? 'active' : ''}" data-value="${String(o.value).replace(/"/g, '&quot;')}" role="option">${o.label}</button>`,
          )
          .join('')
      : `<div class="option empty">—</div>`;

    for (const opt of qsa(listbox, '.option[data-value]')) {
      opt.addEventListener('click', () => {
        if (this.disabled) return;
        this._select(opt.dataset.value);
      });
      opt.addEventListener('mousemove', () => qsa(listbox, '.option').forEach((o) => o.classList.toggle('active', o === opt)));
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; position: relative; }
  .field { display: grid; gap: var(--spacing-1); }
  .label { font-size: var(--text-sm); font-weight: 500; }
  .label:empty { display: none; }
  .trigger {
    display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2);
    width: 100%; box-sizing: border-box; font-size: var(--text-sm); line-height: 1.5;
    color: hsl(var(--foreground)); background: hsl(var(--background));
    border: 1px solid hsl(var(--input)); border-radius: var(--radius);
    padding: var(--spacing-2) var(--spacing-3); cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
  }
  .trigger:hover:not(.disabled) { border-color: hsl(var(--ring) / .5); }
  .trigger:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 1px; }
  .trigger.disabled { opacity: .5; cursor: not-allowed; }
  .value.muted { color: hsl(var(--muted-foreground)); }
  .chevron { margin-left: var(--spacing-2); color: hsl(var(--muted-foreground)); flex: none; }
  .listbox {
    display: none; position: absolute; inset-inline: 0; top: calc(100% + var(--spacing-1)); z-index: 40;
    background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius);
    box-shadow: var(--shadow-md); max-height: 17.5rem; overflow-y: auto; padding: var(--spacing-1);
  }
  .listbox.open { display: block; }
  .option {
    display: block; width: 100%; text-align: start; background: transparent; border: 0;
    border-radius: var(--radius-sm); padding: var(--spacing-2); font-size: var(--text-sm);
    color: hsl(var(--foreground)); cursor: pointer;
  }
  .option:hover, .option.active { background: hsl(var(--accent)); }
  .option.empty { color: hsl(var(--muted-foreground)); cursor: default; }
</style>
<div class="field">
  <span class="label" part="label">${''}</span>
  <button type="button" class="trigger" part="trigger" aria-haspopup="listbox" aria-expanded="false">
    <span class="value muted"></span>
    <ui-icon name="chevron-down" size="sm" class="chevron"></ui-icon>
  </button>
  <div class="listbox" role="listbox"></div>
</div>
`;

define('ui-select', UiSelect);