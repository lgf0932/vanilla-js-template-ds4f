/**
 * notes 模块私有组件：<notes-tags-view>
 * 标签管理：新建（回车/按钮）、计数展示、删除（确认弹窗）。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { t } from '../../../core/i18n.js';
import { toast, confirmDialog } from '../../../components/ui/index.js';
import { store, loadTags, createTag, removeTag } from '../store.js';

class NotesTagsView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    const input = qs(this.shadowRoot, '#new-tag');
    const submit = () => this._create();
    qs(this.shadowRoot, '.create-btn').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    this._unsub = store.subscribe(() => this.render());
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  load() {
    loadTags();
  }

  async _create() {
    const input = qs(this.shadowRoot, '#new-tag');
    const name = input.value.trim();
    if (!name) return;
    input.setAttribute('error', '');
    try {
      await createTag(name);
      input.value = '';
      toast.success(t('common.saveSuccess'));
    } catch {
      input.setAttribute('error', t('common.error'));
    }
  }

  render() {
    if (!this.shadowRoot) return;
    const tags = store.getState().tags || [];
    const list = qs(this.shadowRoot, '.tag-list');

    if (!tags.length) {
      list.innerHTML = `
        <ui-empty icon="tag" title="${escapeHtml(t('notes.tags.empty'))}" description="${escapeHtml(t('notes.tags.emptyHint'))}">
          <ui-button slot="action" size="sm" class="empty-create">${escapeHtml(t('notes.tags.createBtn'))}</ui-button>
        </ui-empty>`;
      qs(list, '.empty-create')?.addEventListener('click', () => this._create());
      return;
    }

    list.innerHTML = tags
      .map(
        (tag) => `
        <div class="tag-row">
          <span class="tag-name"><ui-icon name="tag" size="sm"></ui-icon>${escapeHtml(tag.name)}</span>
          <ui-badge variant="secondary">${escapeHtml(t('notes.tags.count', { count: String(tag.count) }))}</ui-badge>
          <button type="button" class="icon-btn danger" data-del="${tag.id}" title="${escapeHtml(t('common.delete'))}">
            <ui-icon name="trash" size="sm"></ui-icon>
          </button>
        </div>`,
      )
      .join('');

    for (const btn of qsa(list, '[data-del]')) {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: t('common.confirmDeleteTitle'),
          message: t('notes.tags.deleteConfirm'),
          confirmText: t('common.delete'),
          cancelText: t('common.cancel'),
          variant: 'destructive',
        });
        if (!ok) return;
        try {
          await removeTag(Number(btn.dataset.del));
          toast.success(t('common.operateSuccess'));
        } catch {
          toast.error(t('common.error'));
        }
      });
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .create-row { display: flex; gap: var(--spacing-2); flex-wrap: wrap; align-items: flex-start; }
  .create-row ui-input { width: min(100%, 18rem); }
  .tag-list { display: grid; gap: var(--spacing-2); }
  .tag-row { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-3);
    background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); }
  .tag-name { display: inline-flex; align-items: center; gap: var(--spacing-2); font-size: var(--text-sm); font-weight: 500; min-width: 0; }
  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem;
    background: transparent; border: 0; border-radius: var(--radius); color: hsl(var(--muted-foreground)); cursor: pointer;
    margin-inline-start: auto; }
  .icon-btn:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  .icon-btn.danger:hover { background: hsl(var(--destructive) / .12); color: hsl(var(--destructive)); }
</style>
<div class="page">
  <div class="create-row">
    <ui-input id="new-tag" label="" placeholder=""></ui-input>
    <ui-button class="create-btn" variant="secondary"><ui-icon name="plus" size="sm"></ui-icon></ui-button>
  </div>
  <div class="tag-list" part="list"></div>
</div>
`;

define('notes-tags-view', NotesTagsView);