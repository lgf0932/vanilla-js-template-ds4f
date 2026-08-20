/**
 * app/components/ui/ui-icon.js
 * <ui-icon name="..." size="sm|md|lg|xl" />
 * 渲染项目自有图标集（icons.js），尺寸继承 --text-* token，颜色 currentColor。
 */

import { define, attachTemplate } from './base.js';
import { iconBody } from './icons.js';

const SIZES = {
  xs: 'var(--text-xs)',
  sm: 'var(--text-sm)',
  md: 'var(--text-base)',
  lg: 'var(--text-xl)',
  xl: 'var(--text-2xl)',
};

class UiIcon extends HTMLElement {
  static observedAttributes = ['name', 'size'];

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const root = attachTemplate(this, '');
    const sizeVar = SIZES[this.getAttribute('size')] || 'var(--text-base)';
    const name = this.getAttribute('name') || 'sparkles';

    root.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; justify-content: center; width: 1em; height: 1em; font-size: ${sizeVar}; line-height: 1; }
        svg { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
        svg circle, svg rect { fill: none; }
      </style>
      <svg viewBox="0 0 24 24" part="svg" aria-hidden="true" focusable="false">${iconBody(name)}</svg>
    `;
  }
}

define('ui-icon', UiIcon);