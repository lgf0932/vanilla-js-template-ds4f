/**
 * app/components/layout/app-shell.js
 * <app-shell> — 整体布局容器（sidebar-with-header，固定 grid 不随内容伸缩）。
 * 内部固定挂载 <app-sidebar> + <app-header> + <app-main>（ARCHITECTURE.md 3.1 节）。
 * 移动端（<640px）侧边栏收为可呼出抽屉 + 遮罩；仅 app-main 允许滚动。
 */

import { define, attachTemplate, qs, emit } from '../ui/base.js';
import './app-sidebar.js';
import './app-header.js';
import './app-main.js';

class AppShell extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._sidebar = qs(this.shadowRoot, 'app-sidebar');
    this._main = qs(this.shadowRoot, 'app-main');
    this._backdrop = qs(this.shadowRoot, '.backdrop');

    qs(this.shadowRoot, 'app-header').addEventListener('menu-toggle', () => this.toggleDrawer());
    this._backdrop.addEventListener('click', () => this.closeDrawer());
  }

  get viewport() {
    return this._main.viewport;
  }

  /** @param {Array} menu 由 bootstrap 依据模块注册表生成 */
  setMenu(menu) {
    this._sidebar.setMenu(menu);
  }

  setBreadcrumb(crumbs) {
    qs(this.shadowRoot, 'app-header').setBreadcrumb(crumbs);
  }

  setActive(path) {
    this._sidebar.setActive(path);
  }

  toggleDrawer() {
    this._sidebar.classList.toggle('drawer-open');
    this._backdrop.classList.toggle('visible');
  }

  closeDrawer() {
    this._sidebar.classList.remove('drawer-open');
    this._backdrop.classList.remove('visible');
  }
}

const TEMPLATE = `
<style>
  :host { display: grid; height: 100dvh; overflow: hidden;
    grid-template-areas: "header header" "sidebar main";
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-rows: var(--header-height) 1fr; }
  app-header  { grid-area: header; }
  app-sidebar { grid-area: sidebar; background: hsl(var(--background)); border-inline-end: 1px solid hsl(var(--border)); }
  app-main    { grid-area: main; }
  .backdrop { display: none; }
  /* 移动端：侧边栏变抽屉 */
  @media (max-width: 39.99rem) {
    :host { grid-template-areas: "header" "main"; grid-template-columns: 1fr; }
    app-sidebar {
      position: fixed; z-index: 30; inset-block-start: var(--header-height); inset-inline: 0 auto;
      width: min(var(--sidebar-width), 85vw); height: calc(100dvh - var(--header-height));
      transform: translateX(-100%); transition: transform var(--duration-normal) var(--ease-out);
      box-shadow: var(--shadow-lg);
    }
    app-sidebar.drawer-open { transform: translateX(0); }
    .backdrop { display: block; position: fixed; inset: 0; z-index: 20; background: hsl(var(--backdrop) / .45);
      opacity: 0; pointer-events: none; transition: opacity var(--duration-normal) var(--ease-out); }
    .backdrop.visible { opacity: 1; pointer-events: auto; }
  }
</style>
<app-header></app-header>
<app-sidebar></app-sidebar>
<app-main></app-main>
<div class="backdrop"></div>
`;

define('app-shell', AppShell);