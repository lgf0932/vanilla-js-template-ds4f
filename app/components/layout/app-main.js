/**
 * app/components/layout/app-main.js
 * <app-main> — 唯一允许滚动的内容区（ARCHITECTURE.md 3.1 节布局契约）。
 * 模块视图统一挂载到 #viewport；仅此处 overflow-y: auto，
 * <app-sidebar> / <app-header> 一律 overflow: hidden。
 */

import { define, attachTemplate, qs } from '../ui/base.js';

class AppMain extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._viewport = qs(this.shadowRoot, '#viewport');
  }

  /** 模块视图挂载点（bootstrap 路由渲染目标） */
  get viewport() {
    return this._viewport;
  }
}

const TEMPLATE = `
<style>
  :host { display: block; min-width: 0; min-height: 0; overflow: hidden; }
  .main {
    height: 100%; overflow-y: auto; overflow-x: hidden;
    background: hsl(var(--background)); color: hsl(var(--foreground));
  }
  #viewport { min-height: 100%; display: flex; flex-direction: column; }
</style>
<main class="main" part="main">
  <div id="viewport" part="viewport"></div>
</main>
`;

define('app-main', AppMain);