/**
 * app/components/ui/ui-badge.js
 * <ui-badge variant="default|secondary|outline|success|warning|destructive" [icon]>…</ui-badge>
 */

import { define, attachTemplate } from './base.js';

class UiBadge extends HTMLElement {
  static observedAttributes = ['variant'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    const el = this.shadowRoot.querySelector('.badge');
    el.className = `badge badge-${this.getAttribute('variant') || 'default'}`;
  }
}

const TEMPLATE = `
<style>
  :host { display: inline-flex; }
  .badge {
    display: inline-flex; align-items: center; gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-full);
    font-size: var(--text-xs); font-weight: 500; line-height: 1; white-space: nowrap;
    border: 1px solid transparent;
  }
  .badge-default   { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .badge-secondary { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); }
  .badge-outline   { background: transparent; color: hsl(var(--foreground)); border-color: hsl(var(--border)); }
  .badge-success   { background: hsl(var(--success) / .14); color: hsl(var(--success)); }
  .badge-warning   { background: hsl(var(--warning) / .16); color: hsl(var(--warning)); }
  .badge-destructive { background: hsl(var(--destructive) / .14); color: hsl(var(--destructive)); }
</style>
<span part="badge" class="badge"><slot></slot></span>
`;

define('ui-badge', UiBadge);