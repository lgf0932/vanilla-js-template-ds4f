/**
 * app/components/ui/ui-button.js
 * <ui-button variant="primary|secondary|ghost|outline|destructive" size="sm|md|lg" [disabled] [loading]>
 * 纯 CSS token 着色；shadow DOM 隔离；Enter/Space 语义由原生 <button> 提供。
 */

import { define, attachTemplate, qs } from './base.js';

class UiButton extends HTMLElement {
  static observedAttributes = ['variant', 'size', 'disabled', 'loading'];

  connectedCallback() {
    if (this.shadowRoot) return;
    const root = attachTemplate(this, TEMPLATE);
    this._btn = qs(root, 'button');
    this.addEventListener('click', (e) => {
      if (this.disabled || this.loading) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  get loading() {
    return this.hasAttribute('loading');
  }

  get variant() {
    return this.getAttribute('variant') || 'primary';
  }

  get size() {
    return this.getAttribute('size') || 'md';
  }

  /** 原生 button 元素（表单等场景需要） */
  get buttonEl() {
    return this._btn;
  }

  render() {
    if (!this._btn) return;
    const btn = this._btn;
    btn.className = `btn btn-${this.variant} btn-${this.size}`;
    btn.disabled = this.disabled || this.loading;
    btn.setAttribute('aria-busy', this.loading ? 'true' : 'false');
    const spin = btn.querySelector('[part="spinner"]');
    if (spin) spin.hidden = !this.loading;
  }
}

const TEMPLATE = `
<style>
  :host { display: inline-block; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-2);
    font-weight: 500; line-height: 1; white-space: nowrap; border-radius: var(--radius);
    border: 1px solid transparent; cursor: pointer; transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
    font-size: var(--text-sm); padding: var(--spacing-2) var(--spacing-4);
  }
  .btn:active:not(:disabled) { transform: translateY(1px); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }

  .btn-primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .btn-primary:hover:not(:disabled) { opacity: .9; }
  .btn-secondary { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); }
  .btn-secondary:hover:not(:disabled) { background: hsl(var(--muted)); }
  .btn-ghost { background: transparent; color: hsl(var(--foreground)); }
  .btn-ghost:hover:not(:disabled) { background: hsl(var(--accent)); }
  .btn-outline { background: transparent; color: hsl(var(--foreground)); border-color: hsl(var(--border)); }
  .btn-outline:hover:not(:disabled) { background: hsl(var(--accent)); }
  .btn-destructive { background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground)); }
  .btn-destructive:hover:not(:disabled) { opacity: .9; }

  .btn-sm { font-size: var(--text-xs); padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-sm); }
  .btn-lg { font-size: var(--text-base); padding: var(--spacing-3) var(--spacing-5); border-radius: var(--radius-lg); }

  .spinner { width: 1em; height: 1em; border: 2px solid currentColor; border-right-color: transparent;
    border-radius: var(--radius-full); animation: ui-button-spin .7s linear infinite; }
  @keyframes ui-button-spin { to { transform: rotate(360deg); } }
  ::slotted(*) { display: inline-flex; align-items: center; gap: var(--spacing-1); }
</style>
<button part="button" type="button">
  <span part="spinner" class="spinner" hidden aria-hidden="true"></span>
  <span part="label"><slot></slot></span>
</button>
`;

define('ui-button', UiButton);