/**
 * app/components/layout/app-header.js
 * <app-header> — 顶栏：汉堡按钮（移动端）/ 面包屑 / 主题切换 / 用户标识。
 * 固定高度不滚动（overflow: hidden，ARCHITECTURE.md 3.1 节）。
 */

import { define, attachTemplate, qs, emit, escapeHtml } from '../ui/base.js';
import { i18n, t } from '../../core/i18n.js';
import { preferences } from '../../core/preferences.js';

class AppHeader extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._crumbs = qs(this.shadowRoot, '.crumbs');
    this._userName = qs(this.shadowRoot, '.user-name');
    this._userAvatar = qs(this.shadowRoot, '.avatar');

    qs(this.shadowRoot, '.hamburger').addEventListener('click', () => {
      emit(this, 'menu-toggle', {});
    });
    this._unsubscribeI18n = i18n.onChange(() => this.render());
    this._unsubscribePreferences = preferences.subscribe((state) => this.setPreferences(state));
    this.setPreferences(preferences.getState());
  }

  disconnectedCallback() {
    this._unsubscribeI18n?.();
    this._unsubscribePreferences?.();
  }

  setPreferences(state) {
    this._preferences = state || preferences.getState();
    this.render();
  }

  /** @param {Array<{label:string, href?:string}>} crumbs */
  setBreadcrumb(crumbs) {
    this._breadcrumb = crumbs || [];
    this.render();
  }

  render() {
    if (!this._crumbs) return;
    const profile = this._preferences?.profile || {};
    const name = profile.username || profile.name || t('common.role.admin');
    this._userName.textContent = name;
    if (this._userAvatar) {
      this._userAvatar.textContent = profile.avatar?.type === 'emoji' && profile.avatar.value
        ? profile.avatar.value
        : String(name).trim().slice(0, 1).toUpperCase() || 'N';
    }
    if (!this._breadcrumb?.length) {
      this._crumbs.innerHTML = '';
      return;
    }
    this._crumbs.innerHTML = this._breadcrumb
      .map((c, i) => {
        const isLast = i === this._breadcrumb.length - 1;
        const label = escapeHtml(c.label);
        return c.href && !isLast
          ? `<a class="crumb link" href="${c.href}">${label}</a>`
          : `<span class="crumb" aria-current="${isLast ? 'page' : 'false'}">${label}</span>`;
      })
      .join('<ui-icon name="chevron-right" size="xs" class="crumb-sep"></ui-icon>');
  }
}

const TEMPLATE = `
<style>
  :host { display: block; height: 100%; overflow: hidden; }
  .header {
    display: flex; align-items: center; gap: var(--spacing-2);
    height: 100%; padding-inline: var(--spacing-4);
    background: hsl(var(--background)); border-bottom: 1px solid hsl(var(--border));
  }
  .hamburger {
    display: none; align-items: center; justify-content: center; width: 2rem; height: 2rem;
    background: transparent; border: 0; border-radius: var(--radius); cursor: pointer; color: hsl(var(--foreground));
  }
  .hamburger:hover { background: hsl(var(--accent)); }
  .crumbs { display: flex; align-items: center; gap: var(--spacing-1); min-width: 0; }
  .crumb { font-size: var(--text-sm); color: hsl(var(--muted-foreground)); white-space: nowrap; }
  .crumb[aria-current="page"] { color: hsl(var(--foreground)); font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
  .crumb.link:hover { color: hsl(var(--foreground)); }
  .crumb-sep { color: hsl(var(--muted-foreground)); }
  .spacer { flex: 1; }
  .user { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-full); color: hsl(var(--foreground)); }
  .avatar { width: var(--spacing-8); height: var(--spacing-8); border-radius: var(--radius-full); display: inline-flex; align-items: center;
    justify-content: center; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: var(--text-sm); font-weight: 600; }
  .user-name { font-size: var(--text-xs); font-weight: 500; }
  @media (max-width: 39.99rem) { .hamburger { display: inline-flex; } .user-name { display: none; } }
</style>
<header class="header" part="header">
  <button type="button" class="hamburger" aria-label="menu" aria-haspopup="true">
    <ui-icon name="list-check" size="md"></ui-icon>
  </button>
  <nav class="crumbs" aria-label="breadcrumb"></nav>
  <span class="spacer"></span>
  <ui-theme-switch></ui-theme-switch>
  <div class="user" title="${''}">
    <span class="avatar"><ui-icon name="user" size="sm"></ui-icon></span>
    <span class="user-name"></span>
  </div>
</header>
`;

define('app-header', AppHeader);