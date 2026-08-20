/**
 * dashboard 模块私有组件：<dashboard-view>
 * 信息密度遵循"反留白铁律"：卡片内边距 --spacing-3、数值配图标、空状态带引导按钮。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { t, i18n } from '../../../core/i18n.js';
import { formatNumber, relativeTime } from '../../../lib/format.js';
import { store, loadSummary } from '../store.js';

class DashboardView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._unsub = store.subscribe(() => this.render());
    i18n.onChange(() => this.render());
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  /** 首次挂载时拉取摘要 */
  load() {
    loadSummary();
  }

  render() {
    if (!this.shadowRoot) return;
    const { loading, error, stats, recentNotes, recentConversations } = store.getState();
    const canRender = !loading || stats.notes > 0;

    qs(this.shadowRoot, '.greeting').textContent = t('dashboard.greeting');

    const statWrap = qs(this.shadowRoot, '.stats');
    statWrap.innerHTML = `
      <a class="stat-card" href="/notes" part="stat notes">
        <span class="stat-icon notes"><ui-icon name="note" size="lg"></ui-icon></span>
        <span class="stat-body">
          <span class="stat-number">${formatNumber(stats.notes)}</span>
          <span class="stat-label">${escapeHtml(t('dashboard.stats.notes'))}</span>
        </span>
      </a>
      <a class="stat-card" href="/chat" part="stat chat">
        <span class="stat-icon chat"><ui-icon name="chat" size="lg"></ui-icon></span>
        <span class="stat-body">
          <span class="stat-number">${formatNumber(stats.conversations)}</span>
          <span class="stat-label">${escapeHtml(t('dashboard.stats.chats'))}</span>
        </span>
      </a>
    `;

    this._renderList(
      qs(this.shadowRoot, '.recent-notes'),
      recentNotes,
      'note',
      t('dashboard.recentNotes'),
      t('dashboard.recentNotesEmpty'),
      '/notes',
    );
    this._renderList(
      qs(this.shadowRoot, '.recent-chats'),
      recentConversations,
      'chat',
      t('dashboard.recentChats'),
      t('dashboard.recentChatsEmpty'),
      '/chat',
    );

    if (error) {
      qs(this.shadowRoot, '.error-banner').textContent = `${t('common.error')}（${escapeHtml(error)}）`;
      qs(this.shadowRoot, '.error-banner').hidden = false;
    } else {
      qs(this.shadowRoot, '.error-banner').hidden = true;
    }
    if (loading && !canRender) {
      qs(this.shadowRoot, '.skeleton').hidden = false;
    } else {
      qs(this.shadowRoot, '.skeleton').hidden = true;
    }
  }

  _renderList(container, items, kind, title, emptyText, href) {
    const card = container.closest('ui-card');
    qs(card, '.card-list-title').textContent = title;
    const list = qs(card, '.card-list');

    if (!items.length) {
      list.innerHTML = `
        <ui-empty icon="${kind}" title="${escapeHtml(emptyText)}" description="${escapeHtml(t('dashboard.emptyHint'))}">
          <ui-button slot="action" size="sm"><a href="${href}">${escapeHtml(t('common.create'))}</a></ui-button>
        </ui-empty>`;
      return;
    }

    list.innerHTML = items
      .map(
        (item) => `
        <a class="row" href="${item.href || href}">
          <span class="row-icon"><ui-icon name="${kind}" size="sm"></ui-icon></span>
          <span class="row-main">
            <span class="row-title">${escapeHtml(item.title || '')}</span>
            <span class="row-sub">${escapeHtml(item.subtitle || '')}</span>
          </span>
          <span class="row-time">${escapeHtml(relativeTime(item.updatedAt || item.createdAt, Date.now(), i18n.lang))}</span>
        </a>`,
      )
      .join('');
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .greeting { font-size: var(--text-xl); font-weight: 700; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: var(--spacing-3); }
  .stat-card {
    display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-3);
    background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg);
    transition: border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  }
  .stat-card:hover { border-color: hsl(var(--ring) / .4); transform: translateY(-1px); }
  .stat-icon { display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem;
    border-radius: var(--radius); background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
  .stat-icon.notes { color: hsl(var(--primary)); }
  .stat-icon.chat { color: hsl(var(--success)); }
  .stat-body { display: grid; gap: var(--spacing-1); }
  .stat-number { font-size: var(--text-2xl); font-weight: 700; line-height: 1; }
  .stat-label { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: var(--spacing-3); }
  .card-list { display: grid; gap: var(--spacing-1); }
  .row { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-2);
    border-radius: var(--radius); transition: background var(--duration-fast) var(--ease-out); }
  .row:hover { background: hsl(var(--accent)); }
  .row-icon { color: hsl(var(--muted-foreground)); flex: none; }
  .row-main { min-width: 0; display: grid; gap: var(--spacing-1); flex: 1; }
  .row-title { font-size: var(--text-sm); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-sub { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-time { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); flex: none; }
  .error-banner { font-size: var(--text-sm); color: hsl(var(--destructive)); background: hsl(var(--destructive) / .08);
    padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius); }
  .skeleton { min-height: 8rem; }
  ui-button a { color: inherit; }
</style>
<div class="page">
  <h1 class="greeting" part="greeting"></h1>
  <div class="error-banner" hidden></div>
  <div class="stats" part="stats"></div>
  <div class="cols">
    <ui-card class="recent-notes" title="">
      <span class="card-list-title" slot="header-extra"></span>
      <div class="card-list"></div>
    </ui-card>
    <ui-card class="recent-chats" title="">
      <span class="card-list-title" slot="header-extra"></span>
      <div class="card-list"></div>
    </ui-card>
  </div>
  <div class="skeleton" hidden><ui-empty icon="refresh" title="${''}" description="${''}"> </ui-empty></div>
</div>
`;

define('dashboard-view', DashboardView);