/**
 * notes 模块私有组件：<note-editor>
 * 新建/编辑笔记弹窗（ui-dialog）：标题 + 正文 + 标签多选（chips）。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../ui/base.js';
import { t } from '../../core/i18n.js';
import { toast } from '../../ui/index.js';
import { validate, schemas, i18nErrors } from '../../lib/validate.js';
import { store, createNote, updateNote } from '../store.js';

class NoteEditor extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._note = null;

    qs(this.shadowRoot, '.save').addEventListener('click', () => this._save());
    qs(this.shadowRoot, '.cancel').addEventListener('click', () => this._dialog.close());
    qs(this.shadowRoot, 'ui-dialog').addEventListener('close', () => this._dialog.removeAttribute('open'));
  }

  /** 打开编辑器：note 为空则新建 */
  open(note = null) {
    this._note = note;
    const dialog = this._dialog;
    dialog.setAttribute('title', note ? t('notes.editor.editTitle') : t('notes.editor.createTitle'));

    const titleInput = qs(this.shadowRoot, '#title');
    titleInput.value = note?.title || '';
    titleInput.removeAttribute('error');
    qs(this.shadowRoot, '#body').value = note?.body || '';
    qs(this.shadowRoot, '.error-msg').textContent = '';

    // 渲染标签 chips（选中态 = 当前笔记拥有的标签）
    const tags = store.getState().tags || [];
    const current = new Set(note?.tags?.map((x) => String(x.id)) || []);
    const wrap = qs(this.shadowRoot, '.tag-chips');
    wrap.innerHTML = tags.length
      ? tags
          .map(
            (tag) => `
        <button type="button" class="chip ${current.has(String(tag.id)) ? 'on' : ''}" data-id="${tag.id}" data-name="${escapeHtml(tag.name)}">
          ${escapeHtml(tag.name)}
        </button>`,
          )
          .join('')
      : `<span class="no-tags">${escapeHtml(t('notes.editor.noTags'))}</span>`;

    qsa(wrap, '.chip').forEach((chip) => {
      chip.addEventListener('click', () => chip.classList.toggle('on'));
    });

    dialog.openDialog();
  }

  async _save() {
    const title = qs(this.shadowRoot, '#title').value.trim();
    const body = qs(this.shadowRoot, '#body').value;
    const tagIds = qsa(this.shadowRoot, '.chip.on').map((c) => Number(c.dataset.id));

    const errors = validate({ title }, { title: schemas.note.title });
    const errMsg = qs(this.shadowRoot, '.error-msg');
    if (errors.title) {
      errMsg.textContent = i18nErrors(errors, t, 'common.validation').title;
      return;
    }
    errMsg.textContent = '';

    const saveBtn = qs(this.shadowRoot, '.save');
    saveBtn.setAttribute('loading', '');
    try {
      if (this._note) await updateNote(this._note.id, { title, body, tagIds });
      else await createNote({ title, body, tagIds });
      toast.success(t('common.saveSuccess'));
      this._dialog.close();
    } catch {
      toast.error(t('common.error'));
    } finally {
      saveBtn.removeAttribute('loading');
    }
  }

  get _dialog() {
    return qs(this.shadowRoot, 'ui-dialog');
  }
}

const TEMPLATE = `
<style>
  .form { display: grid; gap: var(--spacing-3); }
  .tag-chips { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
  .chip {
    display: inline-flex; align-items: center; gap: var(--spacing-1);
    font-size: var(--text-xs); padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-full); border: 1px solid hsl(var(--border));
    background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .chip:hover { border-color: hsl(var(--ring) / .5); color: hsl(var(--foreground)); }
  .chip.on { background: hsl(var(--primary)); border-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .no-tags { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
  .error-msg { font-size: var(--text-xs); color: hsl(var(--destructive)); }
  .footer { display: flex; justify-content: flex-end; gap: var(--spacing-2); }
</style>
<ui-dialog width="md">
  <div class="form">
    <ui-input id="title" label="" placeholder=""></ui-input>
    <ui-input id="body" multiline rows="8" label="" placeholder=""></ui-input>
    <div>
      <div class="tag-chips"></div>
    </div>
    <p class="error-msg"></p>
  </div>
  <div slot="footer" class="footer">
    <ui-button class="cancel" variant="secondary"></ui-button>
    <ui-button class="save"></ui-button>
  </div>
</ui-dialog>
`;

define('note-editor', NoteEditor);