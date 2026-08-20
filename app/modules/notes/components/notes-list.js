/**
 * notes 模块私有组件：<notes-list-view>
 * 工具栏（搜索/标签筛选/新建）+ 紧凑笔记卡片列表（反留白：--spacing-3、图标、空状态引导）。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { t, i18n } from '../../../core/i18n.js';
import { toast, confirmDialog } from '../../../components/ui/index.js';
import { relativeTime, plainText, truncate } from '../../../lib/format.js';
import { store, loadNotes, loadTags, removeNote, setFilter } from '../store.js';
import './note-editor.js';

class NotesListView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    qs(this.shadowRoot, '.new-btn').addEventListener('click', () => this._editor.open());
    qs(this.shadowRoot, '#search').addEventListener('input', (e) => this._onSearch(e.detail.value));
    qs(this.shadowRoot, '#tag-filter').addEventListener('change', (e) => setFilter({ tag: e.detail.value }));
    qs(this.shadowRoot, '.load-more').addEventListener('click', () => loadNotes({ more: true }));

    this._unsub = store.subscribe(() => this.render());
    i18n.onChange(() => this.render());
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  load() {
    loadTags().then(() => loadNotes());
  }

  _onSearch(value) {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => setFilter({ search: value }), 300);
  }

  render() {
    if (!this.shadowRoot) return;
    const { notes, tags, total, selectedTag, loading, error } = store.getState();

    // 标签筛选下拉（首项"全部标签"）
    const select = qs(this.shadowRoot, '#tag-filter');
    const current = select.value;
    select.options = [{ value: '', label: t('notes.list.allTags') }].concat(
      tags.map((x) => ({ value: String(x.id), label: x.name })),
    );
    select.value = current || selectedTag || '';

    qs(this.shadowRoot, '#search').setAttribute('placeholder', t('notes.list.search'));
    qs(this.shadowRoot, '.list-title').textContent = `${t('notes.list.title')} · ${total}`;

    const list = qs(this.shadowRoot, '.note-list');
    if (!notes.length && !loading) {
      list.innerHTML = `
        <ui-empty icon="inbox" title="${escapeHtml(t('notes.list.empty'))}" description="${escapeHtml(t('notes.list.emptyHint'))}">
          <ui-button slot="action" size="sm" class="empty-new">${escapeHtml(t('notes.list.new'))}</ui-button>
        </ui-empty>`;
      qs(list, '.empty-new')?.addEventListener('click', () => this._editor.open());
    } else {
      list.innerHTML = notes
        .map(
          (n) => `
        <article class="note-card">
          <div class="note-head">
            <h3 class="note-title">${escapeHtml(n.title)}</h3>
            <div class="note-actions">
              <button type="button" class="icon-btn" data-edit="${n.id}" title="${escapeHtml(t('common.edit'))}">
                <ui-icon name="edit" size="sm"></ui-icon>
              </button>
              <button type="button" class="icon-btn danger" data-del="${n.id}" title="${escapeHtml(t('common.delete'))}">
                <ui-icon name="trash" size="sm"></ui-icon>
              </button>
            </div>
          </div>
          ${n.body ? `<p class="note-preview">${escapeHtml(truncate(plainText(n.body), 120))}</p>` : ''}
          <div class="note-meta">
            <span class="note-time"><ui-icon name="calendar" size="xs"></ui-icon>${escapeHtml(relativeTime(n.updatedAt || n.createdAt, Date.now(), i18n.lang))}</span>
            ${(n.tags || []).map((tag) => `<ui-badge variant="outline">${escapeHtml(tag.name)}</ui-badge>`).join('')}
          </div>
        </article>`,
        )
        .join('');
    }

    for (const btn of qsa(list, '[data-edit]')) {
      btn.addEventListener('click', () => {
        const note = notes.find((n) => String(n.id) === btn.dataset.edit);
        if (note) this._editor.open(note);
      });
    }
    for (const btn of qsa(list, '[data-del]')) {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: t('common.confirmDeleteTitle'),
          message: t('common.confirmDeleteBody'),
          confirmText: t('common.delete'),
          cancelText: t('common.cancel'),
          variant: 'destructive',
        });
        if (!ok) return;
        try {
          await removeNote(Number(btn.dataset.del));
          toast.success(t('common.operateSuccess'));
        } catch {
          toast.error(t('common.error'));
        }
      });
    }

    qs(this.shadowRoot, '.load-more-wrap').hidden = notes.length >= total;
    qs(this.shadowRoot, '.error-banner').hidden = !error;
    qs(this.shadowRoot, '.error-banner').textContent = error ? t('common.error') : '';
  }

  get _editor() {
    return qs(this.shadowRoot, 'note-editor');
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); flex-wrap: wrap; }
  .toolbar { display: flex; gap: var(--spacing-2); flex-wrap: wrap; }
  .toolbar ui-input { width: min(100%, 16rem); }
  .toolbar ui-select { width: 11rem; }
  .list-title { font-size: var(--text-sm); color: hsl(var(--muted-foreground)); }
  .note-list { display: grid; gap: var(--spacing-2); }
  .note-card {
    display: grid; gap: var(--spacing-2); padding: var(--spacing-3);
    background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm); transition: border-color var(--duration-fast) var(--ease-out);
  }
  .note-card:hover { border-color: hsl(var(--ring) / .35); }
  .note-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2); }
  .note-title { font-size: var(--text-base); font-weight: 600; line-height: 1.3; }
  .note-actions { display: flex; gap: var(--spacing-1); flex: none; }
  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem;
    background: transparent; border: 0; border-radius: var(--radius); color: hsl(var(--muted-foreground)); cursor: pointer; }
  .icon-btn:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  .icon-btn.danger:hover { background: hsl(var(--destructive) / .12); color: hsl(var(--destructive)); }
  .note-preview { font-size: var(--text-sm); color: hsl(var(--muted-foreground)); line-height: 1.5; }
  .note-meta { display: flex; align-items: center; gap: var(--spacing-2); flex-wrap: wrap; }
  .note-time { display: inline-flex; align-items: center; gap: var(--spacing-1); font-size: var(--text-xs);
    color: hsl(var(--muted-foreground)); }
  .load-more-wrap { display: flex; justify-content: center; }
  .error-banner { font-size: var(--text-sm); color: hsl(var(--destructive)); background: hsl(var(--destructive) / .08);
    padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius); }
</style>
<div class="page">
  <div class="head">
    <div class="toolbar">
      <ui-input id="search" type="search"></ui-input>
      <ui-select id="tag-filter"></ui-select>
    </div>
    <ui-button class="new-btn"><ui-icon name="plus" size="sm"></ui-icon>${escapeHtml(t('notes.list.new'))}</ui-button>
  </div>
  <p class="list-title" part="list-title"></p>
  <div class="error-banner" hidden></div>
  <div class="note-list" part="list"></div>
  <div class="load-more-wrap" hidden>
    <ui-button class="load-more" variant="outline">${escapeHtml(t('notes.list.loadMore'))}</ui-button>
  </div>
</div>
<note-editor></note-editor>
`;

define('notes-list-view', NotesListView);