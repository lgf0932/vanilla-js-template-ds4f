/**
 * app/components/ui/ui-card.js
 * <ui-card title="..." padded="false">  —  信息卡片容器。
 * 遵循"反留白铁律"（ARCHITECTURE.md 3.6 节）：默认内边距 --spacing-3，
 * 不做大面积留白；数值类信息建议配合 <ui-icon> 使用。
 * Slots: default（主体）、header-extra（标题栏右侧）、footer。
 */

import { define, attachTemplate, qs } from './base.js';

class UiCard extends HTMLElement {
  static observedAttributes = ['title', 'padded'];

  connectedCallback() {
    if (this.shadowRoot) return;
    const root = attachTemplate(this, TEMPLATE);
    this._title = qs(root, '.card-title-text');
    this._body = qs(root, '.card-body');
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get bodyEl() {
    return this._body;
  }

  render() {
    if (!this._title) return;
    const title = this.getAttribute('title') || '';
    this._title.textContent = title;
    this._title.hidden = !title;
    const cab = this._title.closest('.card-title');
    if (cab) cab.hidden = !title;
    this._body.classList.toggle('padded', this.getAttribute('padded') !== 'false');
  }
}

const TEMPLATE = `
<style>
  :host { display: block; }
  .card {
    background: hsl(var(--card)); color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm); overflow: hidden;
  }
  .card-title {
    display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4); border-bottom: 1px solid hsl(var(--border));
  }
  .card-title-text { font-size: var(--text-sm); font-weight: 600; }
  .card-title-extra { display: inline-flex; align-items: center; gap: var(--spacing-2); }
  .card-body.padded { padding: var(--spacing-3); }
  .card-body:not(.padded) { padding: 0; }
  .card-footer { padding: var(--spacing-3) var(--spacing-4); border-top: 1px solid hsl(var(--border));
    display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-2); }
</style>
<section part="card" class="card">
  <header class="card-title" hidden>
    <h3 class="card-title-text" part="title"></h3>
    <div class="card-title-extra"><slot name="header-extra"></slot></div>
  </header>
  <div class="card-body" part="body"><slot></slot></div>
  <footer class="card-footer" hidden><slot name="footer"></slot></footer>
</section>
`;

define('ui-card', UiCard);