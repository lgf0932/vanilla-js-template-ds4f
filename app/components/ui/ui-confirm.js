/**
 * app/components/ui/ui-confirm.js
 * 替代 window.confirm 的确认弹窗（Promise 化）：
 *   const ok = await confirmDialog({ title, message, confirmText, cancelText, variant });
 * 视觉与 <ui-dialog> 同源，Esc/取消/遮罩返回 false。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from './base.js';

class UiConfirm extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._resolve = null;

    qs(this.shadowRoot, '.cancel').addEventListener('click', () => this._finish(false));
    qs(this.shadowRoot, '.confirm').addEventListener('click', () => this._finish(true));
    qs(this.shadowRoot, '.backdrop').addEventListener('mousedown', (e) => {
      if (e.target === qs(this.shadowRoot, '.backdrop')) this._finish(false);
    });
    this._keyHandler = (e) => {
      if (e.key === 'Escape') this._finish(false);
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._keyHandler);
  }

  /** 展示确认框，返回 Promise<boolean> */
  present(options) {
    const root = this.shadowRoot;
    qs(root, '.title').textContent = options.title || '';
    qs(root, '.message').textContent = options.message || '';
    qs(root, '.confirm').textContent = options.confirmText || 'OK';
    qs(root, '.cancel').textContent = options.cancelText || 'Cancel';
    const confirmBtn = qs(root, '.confirm');
    confirmBtn.className = `confirm ${options.variant === 'destructive' ? 'destructive' : ''}`;
    root.querySelector('.overlay').classList.add('visible');
    confirmBtn.focus();
    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  _finish(result) {
    if (!this._resolve) return;
    this.shadowRoot.querySelector('.overlay').classList.remove('visible');
    const resolve = this._resolve;
    this._resolve = null;
    resolve(result);
  }
}

const TEMPLATE = `
<style>
  .overlay {
    position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center;
    padding: var(--spacing-4); background: hsl(var(--backdrop) / .5);
  }
  .overlay.visible { display: flex; }
  .backdrop { position: absolute; inset: 0; }
  .panel { position: relative; width: 100%; max-width: var(--dialog-width-sm); background: hsl(var(--card));
    color: hsl(var(--card-foreground)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg); padding: var(--spacing-4); display: grid; gap: var(--spacing-3); }
  .title { font-size: var(--text-base); font-weight: 600; display: flex; align-items: center; gap: var(--spacing-2); }
  .message { font-size: var(--text-sm); color: hsl(var(--muted-foreground)); }
  .actions { display: flex; justify-content: flex-end; gap: var(--spacing-2); margin-top: var(--spacing-2); }
  button {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-2);
    font-size: var(--text-sm); font-weight: 500; padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius); border: 1px solid transparent; cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out);
  }
  .cancel { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); }
  .cancel:hover { background: hsl(var(--muted)); }
  .confirm { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .confirm:hover { opacity: .9; }
  .confirm.destructive { background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground)); }
</style>
<div class="overlay">
  <div class="backdrop"></div>
  <section class="panel" role="alertdialog" aria-modal="true">
    <div class="title"><ui-icon name="bell" size="md"></ui-icon><span></span></div>
    <p class="message"></p>
    <div class="actions">
      <button type="button" class="cancel"></button>
      <button type="button" class="confirm"></button>
    </div>
  </section>
</div>
`;

/** 全局确认框实例 */
let _confirmEl = null;
function getConfirm() {
  if (!_confirmEl) {
    _confirmEl = document.createElement('ui-confirm');
    document.body.appendChild(_confirmEl);
  }
  return _confirmEl;
}

/**
 * @param {{title?:string, message?:string, confirmText?:string, cancelText?:string, variant?:'default'|'destructive'}} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog(options = {}) {
  return getConfirm().present(options);
}

define('ui-confirm', UiConfirm);