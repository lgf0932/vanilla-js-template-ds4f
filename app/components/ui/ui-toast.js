/**
 * app/components/ui/ui-toast.js
 * 替代 window.alert/confirm 提示的 Toast 系统（AGENTS 红线 #2）。
 * 用法：toast.success('已保存') / toast.error('出错了') / toast.info('...')。
 * 自动消失 + 手动关闭，堆叠在视口右上角。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from './base.js';

const ICON_BY_TYPE = { success: 'check', error: 'x', info: 'bell' };

class UiToastStack extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
  }

  push(type, message) {
    const root = this.shadowRoot;
    const item = document.createElement('div');
    item.className = `item ${type}`;
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    item.innerHTML = `
      <ui-icon name="${ICON_BY_TYPE[type] || 'bell'}" size="sm"></ui-icon>
      <span class="msg">${escapeHtml(message)}</span>
      <button type="button" class="dismiss" aria-label="close"><ui-icon name="x" size="xs"></ui-icon></button>
    `;
    qs(root, '.stack').appendChild(item);

    const dismiss = () => {
      item.classList.add('leaving');
      setTimeout(() => item.remove(), 180);
      clearTimeout(item._timer);
    };
    qs(item, '.dismiss').addEventListener('click', dismiss);
    item._timer = setTimeout(dismiss, 3500);
  }
}

const TEMPLATE = `
<style>
  :host { position: fixed; inset-block-start: var(--spacing-4); inset-inline-end: var(--spacing-4); z-index: 70;
    display: block; pointer-events: none; }
  .stack { display: grid; gap: var(--spacing-2); justify-items: end; }
  .item {
    pointer-events: auto; display: flex; align-items: center; gap: var(--spacing-2);
    max-width: 22rem; background: hsl(var(--card)); color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border)); border-radius: var(--radius); box-shadow: var(--shadow-md);
    padding: var(--spacing-2) var(--spacing-3);
    animation: ui-toast-in var(--duration-normal) var(--ease-out);
  }
  .item.success ui-icon { color: hsl(var(--success)); }
  .item.error ui-icon { color: hsl(var(--destructive)); }
  .item.info ui-icon { color: hsl(var(--primary)); }
  .msg { font-size: var(--text-sm); }
  .item.leaving { opacity: 0; transform: translateX(var(--spacing-4)); transition: all var(--duration-fast) var(--ease-out); }
  .dismiss { flex: none; display: inline-flex; background: transparent; border: 0; border-radius: var(--radius-sm);
    color: hsl(var(--muted-foreground)); cursor: pointer; padding: var(--spacing-1); }
  .dismiss:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  @keyframes ui-toast-in { from { opacity: 0; transform: translateX(var(--spacing-4)); } to { opacity: 1; transform: translateX(0); } }
  @media (max-width: 39.99rem) { :host { inset-inline: var(--spacing-3); } .item { max-width: none; } }
</style>
<div class="stack"></div>
`;

let _stack = null;
function getStack() {
  if (!_stack) {
    _stack = document.createElement('ui-toast-stack');
    document.body.appendChild(_stack);
  }
  return _stack;
}

export const toast = {
  success(message) {
    getStack().push('success', message);
  },
  error(message) {
    getStack().push('error', message);
  },
  info(message) {
    getStack().push('info', message);
  },
};

define('ui-toast-stack', UiToastStack);