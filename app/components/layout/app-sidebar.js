/**
 * app/components/layout/app-sidebar.js
 * <app-sidebar> — 侧边导航。菜单项从模块注册表自动派生（bootstrap 调用 setMenu），
 * 禁止手写菜单项、禁止新增本区域滚动（ARCHITECTURE.md 3.1 节）。
 */

import { define, attachTemplate, qs, escapeHtml } from '../ui/base.js';
import { t } from '../../core/i18n.js';

class AppSidebar extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._nav = qs(this.shadowRoot, '.nav');
  }

  /** @param {Array<{id:string, icon:string, href:string, label:string, submodules:Array}>} menu */
  setMenu(menu) {
    this._menu = menu || [];
    this.render();
  }

  /** 高亮当前路由对应的菜单项（一级含子模块命中） */
  setActive(path) {
    this._activePath = path;
    this.render();
  }

  render() {
    if (!this._nav) return;
    const items = this._menu
      .map(
        (m) => `
        <div class="item-wrap">
          <a class="item ${this._isRootActive(m.href) ? 'active' : ''}" href="${m.href}" role="menuitem">
            <ui-icon name="${m.icon}" size="sm"></ui-icon>
            <span class="label">${escapeHtml(m.label)}</span>
            ${m.submodules?.length ? '<ui-icon name="chevron-down" size="xs" class="caret"></ui-icon>' : ''}
          </a>
          ${m.submodules?.length ? this._renderSubs(m) : ''}
        </div>`,
      )
      .join('');
    this._nav.innerHTML = items || `<div class="empty">${escapeHtml(t('sidebar.empty'))}</div>`;
  }

  _isRootActive(href) {
    const path = this._activePath || '';
    return path === href || path.startsWith(href + '/');
  }

  _renderSubs(m) {
    return `
      <div class="subs" role="group">
        ${m.submodules
          .map(
            (s) => `
          <a class="sub ${this._activePath === s.href ? 'active' : ''}" href="${s.href}">
            <ui-icon name="${s.icon || 'chevron-right'}" size="xs"></ui-icon>
            <span class="label">${escapeHtml(s.label)}</span>
          </a>`,
          )
          .join('')}
      </div>`;
  }
}

const TEMPLATE = `
<style>
  :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .brand {
    display: flex; align-items: center; gap: var(--spacing-2); flex: none;
    height: var(--header-height); padding-inline: var(--spacing-4);
    border-bottom: 1px solid hsl(var(--border));
  }
  .brand-name { font-weight: 700; font-size: var(--text-base); letter-spacing: .02em; }
  .brand-badge { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
  .nav { flex: 1; overflow: hidden; padding: var(--spacing-2); display: grid; align-content: start; gap: var(--spacing-1); }
  .nav:hover { overflow-y: auto; }
  .item-wrap { display: grid; gap: var(--spacing-1); }
  .item, .sub {
    display: flex; align-items: center; gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius);
    font-size: var(--text-sm); color: hsl(var(--muted-foreground)); white-space: nowrap;
    transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
  }
  .item:hover, .sub:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  .item.active, .sub.active { background: hsl(var(--accent)); color: hsl(var(--foreground)); font-weight: 500; }
  .label { overflow: hidden; text-overflow: ellipsis; }
  .caret { margin-left: auto; color: hsl(var(--muted-foreground)); }
  .subs { display: grid; gap: var(--spacing-1); margin-inline-start: var(--spacing-4); padding-inline-start: var(--spacing-2);
    border-inline-start: 1px solid hsl(var(--border)); }
  .sub { padding-block: var(--spacing-1); font-size: var(--text-xs); }
  .empty { padding: var(--spacing-3); font-size: var(--text-xs); color: hsl(var(--muted-foreground)); text-align: center; }
  ::-webkit-scrollbar { width: .5rem; }
  ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: var(--radius-full); }
</style>
<slot></slot>
<header class="brand">
  <ui-icon name="sparkles" size="lg"></ui-icon>
  <span class="brand-name">Nova</span>
  <span class="brand-badge">v0.1</span>
</header>
<nav class="nav" role="menubar"></nav>
`;

define('app-sidebar', AppSidebar);