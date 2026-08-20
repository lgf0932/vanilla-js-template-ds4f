/**
 * app/components/layout/app-sidebar.js
 * <app-sidebar> — 模块注册表驱动的导航 + 工作空间切换器。
 * 侧边栏本身不新增滚动区域；过多菜单由图标态收缩承载。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../ui/base.js';
import { t } from '../../core/i18n.js';
import { preferences } from '../../core/preferences.js';

class AppSidebar extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._nav = qs(this.shadowRoot, '.nav');
    this._workspacePanel = qs(this.shadowRoot, '.workspace-panel');
    this._workspaceButton = qs(this.shadowRoot, '.workspace-button');
    this._profile = qs(this.shadowRoot, '.profile');
    this._workspaceButton.addEventListener('click', () => this._toggleWorkspacePanel());
    this._unsubscribePreferences = preferences.subscribe((state) => this.setPreferences(state));
    this.setPreferences(preferences.getState());
  }

  disconnectedCallback() {
    this._unsubscribePreferences?.();
  }

  /** @param {Array<{id:string, icon:string, href:string, label:string, submodules:Array}>} menu */
  setMenu(menu) {
    this._menu = menu || [];
    this.render();
  }

  setPreferences(state) {
    this._preferences = state || preferences.getState();
    this.dataset.open = String(this._preferences.sidebarOpen !== false);
    this.dataset.collapsible = this._preferences.sidebarCollapsible || 'icon';
    this.dataset.variant = this._preferences.sidebarVariant || 'inset';
    this.render();
  }

  /** 高亮当前路由对应的菜单项（一级含子模块命中） */
  setActive(path) {
    this._activePath = path;
    this.render();
  }

  render() {
    if (!this._nav) return;
    const state = this._preferences || preferences.getState();
    const hidden = new Set(state.hiddenNav || []);
    const menu = (this._menu || [])
      .filter((item) => !hidden.has(item.id))
      .map((item) => ({
        ...item,
        submodules: (item.submodules || []).filter((sub) => !hidden.has(`${item.id}:${sub.id}`)),
      }));

    this._nav.innerHTML = menu
      .map((m) => `
        <div class="item-wrap">
          <a class="item ${this._isRootActive(m.href) ? 'active' : ''}" href="${m.href}" role="menuitem">
            <ui-icon name="${escapeHtml(m.icon)}" size="sm"></ui-icon>
            <span class="label">${escapeHtml(m.label)}</span>
            ${m.submodules?.length ? '<ui-icon name="chevron-down" size="xs" class="caret"></ui-icon>' : ''}
          </a>
          ${m.submodules?.length ? this._renderSubs(m) : ''}
        </div>`)
      .join('') || `<div class="empty">${escapeHtml(t('sidebar.empty'))}</div>`;

    this._renderWorkspace(state);
    this._renderProfile(state);
  }

  _isRootActive(href) {
    const path = this._activePath || '';
    return path === href || path.startsWith(`${href}/`);
  }

  _renderSubs(module) {
    return `
      <div class="subs" role="group">
        ${module.submodules.map((sub) => `
          <a class="sub ${this._activePath === sub.href ? 'active' : ''}" href="${sub.href}">
            <ui-icon name="${escapeHtml(sub.icon || 'chevron-right')}" size="xs"></ui-icon>
            <span class="label">${escapeHtml(sub.label)}</span>
          </a>`).join('')}
      </div>`;
  }

  _renderWorkspace(state) {
    const list = state.workspaces || [];
    const active = list.find((item) => item.id === state.activeWorkspace) || list[0];
    const label = preferences.workspaceName(active, state.locale);
    qs(this.shadowRoot, '.workspace-name').textContent = label;
    qs(this.shadowRoot, '.workspace-note').textContent = t('sidebar.workspaces');
    const listEl = qs(this.shadowRoot, '.workspace-list');
    listEl.innerHTML = list.map((workspace) => `
      <button type="button" class="workspace-item ${workspace.id === active?.id ? 'active' : ''}" data-workspace="${escapeHtml(workspace.id)}">
        <span class="workspace-mark"><ui-icon name="${escapeHtml(workspace.icon)}" size="sm"></ui-icon></span>
        <span class="workspace-item-name">${escapeHtml(preferences.workspaceName(workspace, state.locale))}</span>
        ${workspace.id === active?.id ? '<ui-icon name="check" size="sm" class="workspace-check"></ui-icon>' : ''}
      </button>`).join('');
    for (const item of qsa(listEl, '[data-workspace]')) {
      item.addEventListener('click', () => {
        preferences.setWorkspace(item.dataset.workspace);
        this._workspacePanel.hidden = true;
      });
    }
  }

  _renderProfile(state) {
    const profile = state.profile || {};
    const name = profile.username || profile.name || t('common.role.admin');
    qs(this.shadowRoot, '.profile-name').textContent = name;
    qs(this.shadowRoot, '.profile-email').textContent = profile.email || t('sidebar.profileHint');
    const avatar = qs(this.shadowRoot, '.profile-avatar');
    avatar.textContent = profile.avatar?.type === 'emoji' && profile.avatar.value
      ? profile.avatar.value
      : String(name).trim().slice(0, 1).toUpperCase() || 'N';
  }

  _toggleWorkspacePanel() {
    this._workspacePanel.hidden = !this._workspacePanel.hidden;
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
  .item-wrap { display: grid; gap: var(--spacing-1); }
  .item, .sub {
    display: flex; align-items: center; gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius);
    font-size: var(--text-sm); color: hsl(var(--muted-foreground)); white-space: nowrap;
    transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
  }
  .item:hover, .sub:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  .item.active, .sub.active { background: hsl(var(--accent)); color: hsl(var(--foreground)); font-weight: 500; }
  .label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .caret { margin-inline-start: auto; color: hsl(var(--muted-foreground)); }
  .subs { display: grid; gap: var(--spacing-1); margin-inline-start: var(--spacing-4); padding-inline-start: var(--spacing-2); border-inline-start: 1px solid hsl(var(--border)); }
  .sub { padding-block: var(--spacing-1); font-size: var(--text-xs); }
  .empty { padding: var(--spacing-3); font-size: var(--text-xs); color: hsl(var(--muted-foreground)); text-align: center; }
  .workspace-area, .profile { position: relative; flex: none; padding: var(--spacing-2); border-top: 1px solid hsl(var(--border)); }
  .workspace-button, .profile-link {
    display: flex; align-items: center; gap: var(--spacing-2); width: 100%; min-width: 0;
    padding: var(--spacing-2); border: 0; border-radius: var(--radius); background: transparent;
    color: hsl(var(--foreground)); text-align: start; cursor: pointer;
  }
  .workspace-button:hover, .profile-link:hover { background: hsl(var(--accent)); }
  .workspace-mark, .profile-avatar {
    display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: var(--spacing-8); height: var(--spacing-8); border-radius: var(--radius);
    background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
  }
  .workspace-copy, .profile-copy { min-width: 0; display: grid; gap: var(--spacing-1); }
  .workspace-name, .profile-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); font-weight: 600; }
  .workspace-note, .profile-email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
  .workspace-chevron { margin-inline-start: auto; color: hsl(var(--muted-foreground)); }
  .workspace-panel {
    position: absolute; inset-inline-start: calc(100% + var(--spacing-2)); inset-block-end: var(--spacing-2); z-index: 20;
    width: min(var(--workspace-panel-width), var(--mobile-sidebar-max-width)); padding: var(--spacing-2); background: hsl(var(--card));
    border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
  }
  .workspace-panel[hidden] { display: none; }
  .workspace-list { display: grid; gap: var(--spacing-1); }
  .workspace-item { display: flex; align-items: center; gap: var(--spacing-2); width: 100%; padding: var(--spacing-2); border: 0; border-radius: var(--radius); background: transparent; color: hsl(var(--foreground)); cursor: pointer; text-align: start; }
  .workspace-item:hover, .workspace-item.active { background: hsl(var(--accent)); }
  .workspace-item-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); }
  .workspace-check { margin-inline-start: auto; color: hsl(var(--primary)); }
  :host([data-open="false"][data-collapsible="icon"]) .brand { justify-content: center; padding-inline: var(--spacing-2); }
  :host([data-open="false"][data-collapsible="icon"]) .brand-name,
  :host([data-open="false"][data-collapsible="icon"]) .brand-badge,
  :host([data-open="false"][data-collapsible="icon"]) .label,
  :host([data-open="false"][data-collapsible="icon"]) .caret,
  :host([data-open="false"][data-collapsible="icon"]) .workspace-copy,
  :host([data-open="false"][data-collapsible="icon"]) .workspace-chevron,
  :host([data-open="false"][data-collapsible="icon"]) .profile-copy { display: none; }
  :host([data-open="false"][data-collapsible="icon"]) .item,
  :host([data-open="false"][data-collapsible="icon"]) .workspace-button,
  :host([data-open="false"][data-collapsible="icon"]) .profile-link { justify-content: center; padding-inline: var(--spacing-2); }
  :host([data-open="false"][data-collapsible="icon"]) .subs { display: none; }
  @media (max-width: 39.99rem) {
    .workspace-panel { inset-inline-start: var(--spacing-2); inset-block-end: calc(100% - var(--spacing-2)); }
  }
</style>
<slot></slot>
<header class="brand">
  <ui-icon name="sparkles" size="lg"></ui-icon>
  <span class="brand-name">Nova</span>
  <span class="brand-badge">v0.1</span>
</header>
<nav class="nav" role="menubar"></nav>
<div class="workspace-area">
  <button type="button" class="workspace-button" aria-haspopup="menu" aria-expanded="false">
    <span class="workspace-mark"><ui-icon name="house" size="sm"></ui-icon></span>
    <span class="workspace-copy"><span class="workspace-name"></span><span class="workspace-note"></span></span>
    <ui-icon name="chevrons-up-down" size="sm" class="workspace-chevron"></ui-icon>
  </button>
  <div class="workspace-panel" hidden>
    <div class="workspace-list" role="menu"></div>
    <a class="profile-link" href="/settings/profile">
      <span class="profile-avatar"></span>
      <span class="profile-copy"><span class="profile-name"></span><span class="profile-email"></span></span>
    </a>
  </div>
</div>
<div class="profile">
  <a class="profile-link" href="/settings/profile">
    <span class="profile-avatar"></span>
    <span class="profile-copy"><span class="profile-name"></span><span class="profile-email"></span></span>
  </a>
</div>
`;

define('app-sidebar', AppSidebar);
