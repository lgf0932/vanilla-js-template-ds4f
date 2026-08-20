/**
 * app/components/ui/ui-dialog.js
 * <ui-dialog title="..." width="sm|md|lg" [open]>  —  自研模态弹窗
 * （禁用原生 <dialog> 默认视觉，AGENTS 红线 #2）。
 * Slots：default（主体）、footer（底部操作区）。
 * Esc / 点击遮罩关闭；打开时焦点圈入弹窗，关闭后恢复到触发元素。
 */

import { define, attachTemplate, qs } from './base.js';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), ui-button, ui-input, ui-select';

class UiDialog extends HTMLElement {
  static observedAttributes = ['open', 'title', 'width'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    const closeBtn = qs(this.shadowRoot, '.close');
    const backdrop = qs(this.shadowRoot, '.backdrop');
    const panel = qs(this.shadowRoot, '.panel');

    closeBtn.addEventListener('click', () => this.close());
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) this.close();
    });
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this.open) this.close();
    };
    document.addEventListener('keydown', this._keyHandler);
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._keyHandler);
  }

  get open() {
    return this.hasAttribute('open');
  }

  get title() {
    return this.getAttribute('title') || '';
  }

  /** 打开并捕获焦点 */
  openDialog() {
    if (this.open) return;
    this._previousFocus = document.activeElement;
    this.setAttribute('open', '');
    const panel = qs(this.shadowRoot, '.panel');
    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();
  }

  /** 关闭并恢复焦点 */
  close() {
    if (!this.open) return;
    this.removeAttribute('open');
    this._previousFocus?.focus?.();
    this.dispatchEvent(new Event('close'));
  }

  render() {
    if (!this.shadowRoot) return;
    const overlay = qs(this.shadowRoot, '.overlay');
    const titleEl = qs(this.shadowRoot, '.title');
    overlay.classList.toggle('visible', this.open);
    titleEl.textContent = this.title;
    titleEl.hidden = !this.title;
    const panel = qs(this.shadowRoot, '.panel');
    panel.classList.remove('w-sm', 'w-md', 'w-lg');
    panel.classList.add(`w-${this.getAttribute('width') || 'md'}`);
  }
}

const TEMPLATE = `
<style>
  :host { display: none; }
  :host([open]) { display: contents; }
  .overlay {
    position: fixed; inset: 0; z-index: 50; display: none; align-items: flex-start; justify-content: center;
    padding: var(--spacing-8) var(--spacing-4); background: hsl(var(--backdrop) / .5);
    opacity: 0; transition: opacity var(--duration-normal) var(--ease-out);
  }
  .overlay.visible { display: flex; opacity: 1; }
  .backdrop { position: absolute; inset: 0; }
  .panel {
    position: relative; width: 100%; background: hsl(var(--card)); color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
    max-height: calc(100dvh - var(--spacing-10)); display: flex; flex-direction: column;
    transform: translateY(var(--spacing-2)); opacity: 0;
    transition: transform var(--duration-normal) var(--ease-out), opacity var(--duration-normal) var(--ease-out);
  }
  .overlay.visible .panel { transform: translateY(0); opacity: 1; }
  .w-sm { max-width: var(--dialog-width-sm); }
  .w-md { max-width: var(--dialog-width-md); }
  .w-lg { max-width: var(--dialog-width-lg); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4); border-bottom: 1px solid hsl(var(--border)); }
  .title { font-size: var(--text-base); font-weight: 600; }
  .title[hidden] { display: none; }
  .close { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem;
    background: transparent; border: 0; border-radius: var(--radius); color: hsl(var(--muted-foreground)); cursor: pointer; }
  .close:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  .body { padding: var(--spacing-4); overflow-y: auto; flex: 1; }
  .footer { display: flex; justify-content: flex-end; gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4); border-top: 1px solid hsl(var(--border)); }
  .footer:empty { display: none; }
</style>
<div class="overlay" part="overlay">
  <div class="backdrop"></div>
  <section class="panel" role="dialog" aria-modal="true" aria-label="${''}">
    <header class="head">
      <h3 class="title" part="title"></h3>
      <button type="button" class="close" aria-label="close"><ui-icon name="x" size="sm"></ui-icon></button>
    </header>
    <div class="body" part="body"><slot></slot></div>
    <footer class="footer" part="footer"><slot name="footer"></slot></footer>
  </section>
</div>
`;

define('ui-dialog', UiDialog);