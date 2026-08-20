/**
 * app/components/ui/ui-theme-switch.js
 * 三段式主题胶囊：系统 | 浅色 | 深色（ARCHITECTURE.md 3.5 节）。
 * 与 app/core/theme.js 双向同步：点击即切换并持久化（settings:display）。
 * 键盘：←/→ 在三个档位间切换。
 */

import { define, attachTemplate, qsa } from './base.js';
import { theme } from '../../core/theme.js';
import { t, i18n } from '../../core/i18n.js';

const SEGMENTS = ['system', 'light', 'dark'];

class UiThemeSwitch extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this.render();

    const list = this.shadowRoot.querySelector('[role="radiogroup"]');
    list.addEventListener('click', (e) => {
      const seg = e.target.closest('[role="radio"]');
      if (seg) theme.setMode(seg.dataset.mode);
    });
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const i = SEGMENTS.indexOf(theme.mode);
      const next = SEGMENTS[(i + (e.key === 'ArrowRight' ? 1 : -1) + 3) % 3];
      theme.setMode(next);
    });

    this._onTheme = () => this.render();
    this._onI18n = () => this.render();
    window.addEventListener('theme:applied', this._onTheme);
    i18n.onChange(this._onI18n);
  }

  disconnectedCallback() {
    window.removeEventListener('theme:applied', this._onTheme);
    i18n.onChange(this._onI18n);
  }

  render() {
    if (!this.shadowRoot) return;
    const list = this.shadowRoot.querySelector('[role="radiogroup"]');
    if (!list) return;

    const items = SEGMENTS.map((mode) => ({
      mode,
      icon: { system: 'monitor', light: 'sun', dark: 'moon' }[mode],
      label: t(`common.theme.${mode}`),
    }));

    list.innerHTML = items
      .map(
        (it) => `
        <div class="segment ${it.mode === theme.mode ? 'selected' : ''}" role="radio" data-mode="${it.mode}"
          aria-checked="${it.mode === theme.mode}" tabindex="${it.mode === theme.mode ? 0 : -1}" title="${it.label}">
          <ui-icon name="${it.icon}" size="sm"></ui-icon>
          <span class="label">${it.label}</span>
        </div>`,
      )
      .join('');
  }
}

const TEMPLATE = `
<style>
  :host { display: inline-block; }
  [role="radiogroup"] {
    display: inline-flex; position: relative; gap: var(--spacing-1);
    padding: var(--spacing-1); border-radius: var(--radius-full);
    background: hsl(var(--muted)); border: 1px solid hsl(var(--border));
  }
  .segment {
    display: inline-flex; align-items: center; gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-3); border-radius: var(--radius-full);
    color: hsl(var(--muted-foreground)); cursor: pointer; user-select: none;
    font-size: var(--text-xs); font-weight: 500; white-space: nowrap;
    transition: background var(--duration-normal) var(--ease-out),
      color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
  }
  .segment:hover { color: hsl(var(--foreground)); }
  .segment.selected {
    background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
    box-shadow: var(--shadow-sm);
  }
  @media (max-width: 39.99rem) { .label { display: none; } }
</style>
<div role="radiogroup" aria-label="theme"></div>
`;

define('ui-theme-switch', UiThemeSwitch);