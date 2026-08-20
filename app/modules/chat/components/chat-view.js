/**
 * chat 模块私有组件：<chat-view>
 * 左：会话列表（标题/计数/最后消息/时间）；右：消息线程 + 角色选择 + 发送框。
 * 空状态全部为"图标 + 引导文案 + 操作按钮"（反留白铁律）。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../ui/base.js';
import { t, i18n } from '../../core/i18n.js';
import { toast, confirmDialog } from '../../ui/index.js';
import { relativeTime, truncate } from '../../lib/format.js';
import { store, loadConversations, openConversation, createConversation, removeConversation, sendMessage } from '../store.js';

class ChatView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    qs(this.shadowRoot, '.new-btn').addEventListener('click', () => this._newConversation());
    qs(this.shadowRoot, '.send-btn').addEventListener('click', () => this._send());
    qs(this.shadowRoot, '.composer-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });

    const roleSelect = qs(this.shadowRoot, '.role-select');
    roleSelect.options = [
      { value: 'user', label: t('chat.roleUser') },
      { value: 'assistant', label: t('chat.roleAssistant') },
    ];
    roleSelect.value = 'user';

    this._unsub = store.subscribe(() => this.render());
    i18n.onChange(() => this.render());
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  load() {
    loadConversations();
  }

  async _newConversation() {
    const input = document.createElement('ui-input');
    input.setAttribute('label', t('chat.newTitle'));
    input.setAttribute('placeholder', t('chat.newPlaceholder'));

    const dialog = document.createElement('ui-dialog');
    dialog.setAttribute('title', t('chat.new'));
    dialog.setAttribute('width', 'sm');
    dialog.appendChild(input);
    const footer = document.createElement('div');
    footer.setAttribute('slot', 'footer');
    footer.style.display = 'flex';
    footer.style.gap = 'var(--spacing-2)';
    footer.style.justifyContent = 'flex-end';
    const cancel = document.createElement('ui-button');
    cancel.setAttribute('variant', 'secondary');
    cancel.textContent = t('common.cancel');
    const ok = document.createElement('ui-button');
    ok.textContent = t('common.create');
    footer.append(cancel, ok);
    dialog.appendChild(footer);
    this.shadowRoot.appendChild(dialog);
    dialog.openDialog();

    const close = () => dialog.remove();
    cancel.addEventListener('click', close);
    ok.addEventListener('click', async () => {
      const title = input.value.trim();
      if (!title) return;
      ok.setAttribute('loading', '');
      try {
        await createConversation(title);
        close();
      } catch {
        toast.error(t('common.error'));
      } finally {
        ok.removeAttribute('loading');
      }
    });
    dialog.addEventListener('close', close);
  }

  async _send() {
    const { activeId } = store.getState();
    if (!activeId) return;
    const input = qs(this.shadowRoot, '.composer-input');
    const content = input.value.trim();
    if (!content) return;

    const role = qs(this.shadowRoot, '.role-select').value;
    input.value = '';
    try {
      await sendMessage(activeId, { role, content });
      this._scrollToBottom();
    } catch {
      toast.error(t('common.error'));
    }
  }

  _scrollToBottom() {
    const thread = qs(this.shadowRoot, '.thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  render() {
    if (!this.shadowRoot) return;
    const { conversations, total, activeId, messages, loading } = store.getState();

    // ---- 会话列表 ----
    const list = qs(this.shadowRoot, '.conv-list');
    if (!conversations.length && !loading) {
      list.innerHTML = `
        <ui-empty icon="chat" title="${escapeHtml(t('chat.empty'))}" description="${escapeHtml(t('chat.emptyHint'))}">
          <ui-button slot="action" size="sm" class="empty-new">${escapeHtml(t('chat.new'))}</ui-button>
        </ui-empty>`;
      qs(list, '.empty-new')?.addEventListener('click', () => this._newConversation());
    } else {
      list.innerHTML = conversations
        .map(
          (c) => `
        <button type="button" class="conv-item ${c.id === activeId ? 'active' : ''}" data-id="${c.id}">
          <span class="conv-main">
            <span class="conv-title">${escapeHtml(c.title)}</span>
            <span class="conv-preview">${escapeHtml(truncate(c.lastMessage || '', 36))}</span>
          </span>
          <span class="conv-side">
            <ui-badge variant="secondary">${c.messageCount}</ui-badge>
            <span class="conv-time">${escapeHtml(relativeTime(c.updatedAt || c.createdAt, Date.now(), i18n.lang))}</span>
          </span>
        </button>`,
        )
        .join('');

      for (const item of qsa(list, '.conv-item')) {
        item.addEventListener('click', () => {
          openConversation(Number(item.dataset.id)).catch(() => toast.error(t('common.error')));
        });
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this._deleteConversation(Number(item.dataset.id));
        });
      }
    }
    qs(this.shadowRoot, '.conv-count').textContent = `${t('chat.title')} · ${total}`;

    // ---- 消息线程 ----
    const thread = qs(this.shadowRoot, '.thread');
    if (!activeId) {
      thread.innerHTML = `
        <ui-empty icon="send" title="${escapeHtml(t('chat.threadEmpty'))}" description="${escapeHtml(t('chat.threadEmptyHint'))}">
          <ui-button slot="action" size="sm" class="empty-new2">${escapeHtml(t('chat.new'))}</ui-button>
        </ui-empty>`;
      qs(thread, '.empty-new2')?.addEventListener('click', () => this._newConversation());
    } else if (!messages.length) {
      thread.innerHTML = `
        <ui-empty icon="inbox" title="${escapeHtml(t('chat.threadEmpty'))}" description="${escapeHtml(t('chat.threadEmptyHint'))}"></ui-empty>`;
    } else {
      thread.innerHTML = messages
        .map(
          (m) => `
        <div class="msg ${m.role}">
          <span class="msg-role"><ui-icon name="${m.role === 'assistant' ? 'sparkles' : 'user'}" size="xs"></ui-icon>${escapeHtml(m.role === 'user' ? t('chat.roleUser') : t('chat.roleAssistant'))}</span>
          <p class="msg-content">${escapeHtml(m.content)}</p>
          <span class="msg-time">${escapeHtml(relativeTime(m.createdAt, Date.now(), i18n.lang))}</span>
        </div>`,
        )
        .join('');
    }
    this._scrollToBottom();
  }

  async _deleteConversation(id) {
    const ok = await confirmDialog({
      title: t('common.confirmDeleteTitle'),
      message: t('chat.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await removeConversation(id);
      toast.success(t('common.operateSuccess'));
    } catch {
      toast.error(t('common.error'));
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; height: 100%; padding: var(--content-padding); }
  /* 滚动契约（ARCHITECTURE 3.1）：不新增独立滚动区域，整页由 <app-main> 滚动 */
  .layout {
    max-width: var(--content-max-width); margin-inline: auto;
    display: grid; grid-template-columns: minmax(15rem, 20rem) 1fr; gap: var(--spacing-3); align-items: start;
  }
  .side { display: grid; gap: var(--spacing-2); position: sticky; inset-block-start: 0; align-self: start; }
  .side-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
  .conv-count { font-size: var(--text-sm); color: hsl(var(--muted-foreground)); }
  .conv-list { display: grid; gap: var(--spacing-1); }
  .conv-item { display: flex; align-items: center; gap: var(--spacing-2); text-align: start; padding: var(--spacing-2);
    border-radius: var(--radius); border: 1px solid transparent; background: transparent; cursor: pointer; }
  .conv-item:hover { background: hsl(var(--accent)); }
  .conv-item.active { background: hsl(var(--accent)); border-color: hsl(var(--border)); }
  .conv-main { min-width: 0; flex: 1; display: grid; gap: var(--spacing-1); }
  .conv-title { font-size: var(--text-sm); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .conv-preview { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .conv-side { display: grid; justify-items: end; gap: var(--spacing-1); flex: none; }
  .conv-time { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
  .pane { min-width: 0; display: grid; gap: var(--spacing-2);
    background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg);
    padding: var(--spacing-3); }
  .thread { display: grid; gap: var(--spacing-2); align-content: start; }
  .msg { display: grid; gap: var(--spacing-1); padding: var(--spacing-2); border-radius: var(--radius);
    background: hsl(var(--muted)); max-width: 90%; justify-self: start; }
  .msg.user { background: hsl(var(--primary) / .08); justify-self: end; align-items: end; }
  .msg-role { display: inline-flex; align-items: center; gap: var(--spacing-1); font-size: var(--text-xs);
    font-weight: 600; color: hsl(var(--muted-foreground)); }
  .msg-content { font-size: var(--text-sm); white-space: pre-wrap; word-break: break-word; }
  .msg-time { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); }
  .composer { display: flex; gap: var(--spacing-2); align-items: flex-end; }
  .composer-input { flex: 1; min-width: 0; }
  .role-select { width: 8rem; }
  @media (max-width: 39.99rem) {
    .layout { grid-template-columns: 1fr; }
    .side { position: static; }
    .role-select { width: 6rem; }
  }
</style>
<div class="layout">
  <section class="side">
    <div class="side-head">
      <span class="conv-count" part="count"></span>
      <ui-button class="new-btn" variant="secondary" size="sm"><ui-icon name="plus" size="sm"></ui-icon></ui-button>
    </div>
    <div class="conv-list" part="list"></div>
  </section>
  <section class="pane">
    <div class="thread" part="thread"></div>
    <div class="composer">
      <ui-input class="composer-input" id="composer" multiline rows="2" placeholder=""></ui-input>
      <ui-select class="role-select"></ui-select>
      <ui-button class="send-btn" variant="primary"><ui-icon name="send" size="sm"></ui-icon></ui-button>
    </div>
  </section>
</div>
`;

define('chat-view', ChatView);