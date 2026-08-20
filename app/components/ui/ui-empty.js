/**
 * app/components/ui/ui-empty.js
 * <ui-empty icon="inbox" title="..." description="...">
 *   <ui-button slot="action">…</ui-button>
 * </ui-empty>
 * 空状态铁律（ARCHITECTURE.md 3.6 节）：图标 + 一句引导文案 + 一个操作按钮，禁止纯空白。
 */

import { define, attachTemplate } from './base.js';

class UiEmpty extends HTMLElement {
  static observedAttributes = ['icon', 'title', 'description'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get icon() {
    return this.getAttribute('icon') || 'inbox';
  }

  render() {
    if (!this.shadowRoot) return;
    const title = this.shadowRoot.querySelector('.title');
    const desc = this.shadowRoot.querySelector('.desc');
    const icon = this.shadowRoot.querySelector('.icon');
    if (!title || !desc || !icon) return;
    icon.setAttribute('name', this.icon);
    title.textContent = this.getAttribute('title') || '';
    desc.textContent = this.getAttribute('description') || '';
    desc.hidden = !desc.textContent;
  }
}

const TEMPLATE = `
<style>
  :host { display: block; }
  .empty {
    display: grid; justify-items: center; gap: var(--spacing-2); text-align: center;
    padding: var(--spacing-6) var(--spacing-4); border: 1px dashed hsl(var(--border));
    border-radius: var(--radius-lg); background: hsl(var(--card) / .5);
  }
  .icon { color: hsl(var(--muted-foreground)); opacity: .8; }
  .title { font-size: var(--text-sm); font-weight: 600; color: hsl(var(--foreground)); }
  .desc { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); max-width: 30rem; }
  .action { margin-top: var(--spacing-1); }
</style>
<div class="empty">
  <ui-icon class="icon" name="inbox" size="xl"></ui-icon>
  <div class="title"></div>
  <div class="desc"></div>
  <div class="action"><slot name="action"></slot></div>
</div>
`;

define('ui-empty', UiEmpty);