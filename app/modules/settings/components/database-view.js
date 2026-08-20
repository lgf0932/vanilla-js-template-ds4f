/**
 * settings 模块私有组件：<database-view>
 * 只读展示：数据库驱动、迁移版本、业务表计数、加密配置状态（反留白：图标 + 数值）。
 */

import { define, attachTemplate, qs, escapeHtml } from '../../ui/base.js';
import { t } from '../../core/i18n.js';
import { formatNumber } from '../../lib/format.js';
import { loadDatabaseInfo, store } from '../store.js';

class DatabaseView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._unsub = store.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  load() {
    loadDatabaseInfo().catch(() => {});
  }

  render() {
    if (!this.shadowRoot) return;
    const info = store.getState().database;
    if (!info) {
      // 加载占位：空状态引导（反留白铁律）
      qs(this.shadowRoot, '.stat-grid').innerHTML = `
        <ui-empty icon="database" title="${''}" description="${''}"></ui-empty>`;
      return;
    }

    const tables = [
      { icon: 'note', label: t('settings.database.tableNotes'), value: info.tables.notes },
      { icon: 'tag', label: t('settings.database.tableTags'), value: info.tables.tags },
      { icon: 'chat', label: t('settings.database.tableChats'), value: info.tables.conversations },
      { icon: 'send', label: t('settings.database.tableMessages'), value: info.tables.messages },
    ];

    const grid = qs(this.shadowRoot, '.stat-grid');
    grid.innerHTML = `
      <div class="stat"><span class="stat-icon"><ui-icon name="database" size="lg"></ui-icon></span>
        <span class="stat-value">${escapeHtml(info.driver)}</span><span class="stat-label">${escapeHtml(t('settings.database.driver'))}</span></div>
      <div class="stat"><span class="stat-icon"><ui-icon name="shield-check" size="lg"></ui-icon></span>
        <span class="stat-value">${escapeHtml(String(info.migrationsVersion || 0))}</span><span class="stat-label">${escapeHtml(t('settings.database.migrations'))}</span></div>
      <div class="stat"><span class="stat-icon"><ui-icon name="key" size="lg"></ui-icon></span>
        <span class="stat-value">${info.encryptionConfigured ? 'On' : 'Off'}</span><span class="stat-label">${escapeHtml(t('settings.database.encryption'))}</span></div>
      ${tables
        .map(
          (tb) => `<div class="stat"><span class="stat-icon"><ui-icon name="${tb.icon}" size="lg"></ui-icon></span>
        <span class="stat-value">${formatNumber(tb.value)}</span><span class="stat-label">${escapeHtml(tb.label)}</span></div>`,
        )
        .join('')}
    `;
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: var(--spacing-3); }
  .stat { display: grid; gap: var(--spacing-2); padding: var(--spacing-3); background: hsl(var(--card));
    border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); }
  .stat-icon { color: hsl(var(--muted-foreground)); }
  .stat-value { font-size: var(--text-xl); font-weight: 700; }
  .stat-label { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
</style>
<div class="page">
  <div class="stat-grid" part="stats"></div>
</div>
`;

define('database-view', DatabaseView);