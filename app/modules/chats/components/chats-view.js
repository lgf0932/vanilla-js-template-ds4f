import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { confirmDialog, toast } from '../../../components/ui/index.js';
import { i18n, t } from '../../../core/i18n.js';
import { store, loadChats, visibleConversations, openChat, createChat, removeChat, sendUserMessage, persistConfig } from '../store.js';

class ChatsView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._bind();
    this._unsubscribe = store.subscribe(() => this.render());
    this._unsubscribeI18n = i18n.onChange(() => this.render());
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribeI18n?.();
  }

  load() {
    loadChats();
  }

  _bind() {
    qs(this.shadowRoot, '.new-chat').addEventListener('click', () => this._newChat());
    qs(this.shadowRoot, '.search').addEventListener('input', (event) => store.setState({ query: event.detail.value }));
    qs(this.shadowRoot, '.send').addEventListener('click', () => this._send());
    qs(this.shadowRoot, '.composer').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this._send(); }
    });
    qs(this.shadowRoot, '.provider').addEventListener('change', (event) => this._setDefault({ providerId: event.detail.value }));
    qs(this.shadowRoot, '.model').addEventListener('change', (event) => this._setDefault({ model: event.detail.value }));
    for (const field of qsa(this.shadowRoot, '[data-param]')) field.addEventListener('change', (event) => this._setDefault({ [field.dataset.param]: Number(event.detail.value) }));
    qs(this.shadowRoot, '.thinking').addEventListener('change', (event) => this._setDefault({ thinking: event.detail.value }));
    qs(this.shadowRoot, '.web-search').addEventListener('change', (event) => this._setDefault({ webSearch: event.detail.value === 'true' }));
    qs(this.shadowRoot, '.api-key').addEventListener('input', (event) => {
      const provider = store.getState().config?.defaults?.providerId || '';
      store.setState({ keyDrafts: { ...store.getState().keyDrafts, [provider]: event.detail.value } });
    });
    qs(this.shadowRoot, '.save-config').addEventListener('click', async () => {
      try { await persistConfig(); toast.success(t('chats.saved')); } catch { toast.error(t('common.error')); }
    });
    qs(this.shadowRoot, '.attach').addEventListener('click', () => qs(this.shadowRoot, '.file-input').click());
    qs(this.shadowRoot, '.file-input').addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) toast.success(t('chats.fileAttached', { name: file.name }));
      event.target.value = '';
    });
  }

  _setDefault(patch) {
    const state = store.getState();
    store.setState({ config: { ...state.config, defaults: { ...state.config.defaults, ...patch } } });
  }

  render() {
    if (!this.shadowRoot) return;
    const state = store.getState();
    const config = state.config;
    qs(this.shadowRoot, '.title').textContent = t('chats.title');
    qs(this.shadowRoot, '.description').textContent = t('chats.desc');
    qs(this.shadowRoot, '.inbox-title').textContent = t('chats.inbox');
    qs(this.shadowRoot, '.search').setAttribute('placeholder', t('chats.searchConversations'));
    qs(this.shadowRoot, '.new-chat').textContent = t('chats.newChat');
    qs(this.shadowRoot, '.send').textContent = t('chats.send');
    qs(this.shadowRoot, '.attach').setAttribute('aria-label', t('chats.attach'));
    this._renderViews(state);
    this._renderConversations();
    this._renderThread(state);
    this._renderParameters(config);
    qs(this.shadowRoot, '.error').hidden = !state.error;
    qs(this.shadowRoot, '.error').textContent = state.error ? t('chats.streamError') : '';
  }

  _renderViews(state) {
    const labels = { all: t('chats.all'), favorites: t('chats.favorites'), pinned: t('chats.pinned'), archived: t('chats.archived') };
    qs(this.shadowRoot, '.views').innerHTML = Object.entries(labels).map(([id, label]) => `<button type="button" class="view ${state.view === id ? 'active' : ''}" data-view="${id}"><ui-icon name="${id === 'all' ? 'inbox' : id === 'favorites' ? 'star' : id === 'pinned' ? 'pin' : 'archive'}" size="sm"></ui-icon>${escapeHtml(label)}</button>`).join('');
    for (const button of qsa(this.shadowRoot, '[data-view]')) button.onclick = () => store.setState({ view: button.dataset.view });
  }

  _renderConversations() {
    const state = store.getState();
    const list = visibleConversations();
    const target = qs(this.shadowRoot, '.conversation-list');
    if (!list.length) {
      target.innerHTML = `<ui-empty icon="messages-square" title="${escapeHtml(t('chats.noResults'))}" description="${escapeHtml(t('chats.emptyDesc'))}"><ui-button slot="action" size="sm" class="empty-new">${escapeHtml(t('chats.newChat'))}</ui-button></ui-empty>`;
      qs(target, '.empty-new')?.addEventListener('click', () => this._newChat());
      return;
    }
    target.innerHTML = list.map((conversation) => `<article class="conversation ${conversation.id === state.activeId ? 'active' : ''}" data-conversation="${conversation.id}"><button type="button" class="conversation-main"><span class="conversation-title">${escapeHtml(conversation.title)}</span><span class="conversation-preview">${escapeHtml(conversation.lastMessage || t('chats.noMessages'))}</span></button><button type="button" class="conversation-delete" data-delete-chat="${conversation.id}" aria-label="${escapeHtml(t('chats.delete'))}"><ui-icon name="trash" size="xs"></ui-icon></button></article>`).join('');
    for (const item of qsa(target, '[data-conversation]')) qs(item, '.conversation-main').onclick = () => openChat(Number(item.dataset.conversation));
    for (const button of qsa(target, '[data-delete-chat]')) button.onclick = (event) => { event.stopPropagation(); this._deleteChat(Number(button.dataset.deleteChat)); };
  }

  _renderThread(state) {
    const thread = qs(this.shadowRoot, '.thread');
    if (!state.activeId) {
      thread.innerHTML = `<ui-empty icon="sparkles" title="${escapeHtml(t('chats.emptyTitle'))}" description="${escapeHtml(t('chats.emptyDesc'))}"><ui-button slot="action" size="sm" class="empty-new-thread">${escapeHtml(t('chats.newChat'))}</ui-button></ui-empty>`;
      qs(thread, '.empty-new-thread')?.addEventListener('click', () => this._newChat());
    } else if (!state.messages.length) {
      thread.innerHTML = `<ui-empty icon="message-circle" title="${escapeHtml(t('chats.emptyTitle'))}" description="${escapeHtml(t('chats.typeMessage'))}"></ui-empty>`;
    } else {
      thread.innerHTML = state.messages.map((message, index) => `<article class="message ${message.role === 'user' ? 'user' : 'assistant'}"><div class="message-head"><span><ui-icon name="${message.role === 'user' ? 'user' : 'sparkles'}" size="xs"></ui-icon>${escapeHtml(message.role === 'user' ? t('chats.you') : t('chats.assistant'))}</span><button type="button" class="copy" data-copy="${index}" aria-label="${escapeHtml(t('chats.copy'))}"><ui-icon name="copy" size="xs"></ui-icon></button></div><p>${escapeHtml(message.content || '')}</p></article>`).join('');
      for (const button of qsa(thread, '[data-copy]')) button.onclick = () => { const message = state.messages[Number(button.dataset.copy)]; navigator.clipboard?.writeText(message.content || '').then(() => toast.success(t('chats.copied'))); };
    }
    qs(this.shadowRoot, '.composer').setAttribute('placeholder', t('chats.typeMessage'));
    qs(this.shadowRoot, '.send').toggleAttribute('disabled', !state.activeId || state.streaming);
  }

  _renderParameters(config) {
    if (!config) return;
    const defaults = config.defaults || {};
    const provider = qs(this.shadowRoot, '.provider');
    provider.options = (config.providers || []).map((item) => ({ value: item.id, label: `${item.name}${item.hasKey ? ' · ✓' : ''}` }));
    provider.value = defaults.providerId || config.providers?.[0]?.id || '';
    const providerInfo = config.providers?.find((item) => item.id === provider.value);
    const model = qs(this.shadowRoot, '.model');
    model.setAttribute('label', t('chats.model'));
    model.setAttribute('placeholder', providerInfo?.models?.[0] || t('chats.modelPlaceholder'));
    model.value = defaults.model || providerInfo?.models?.[0] || '';
    qs(this.shadowRoot, '.temperature').setAttribute('label', t('chats.temperature'));
    qs(this.shadowRoot, '.temperature').value = String(defaults.temperature ?? 0.7);
    qs(this.shadowRoot, '.top-p').setAttribute('label', t('chats.topP'));
    qs(this.shadowRoot, '.top-p').value = String(defaults.topP ?? 1);
    qs(this.shadowRoot, '.max-tokens').setAttribute('label', t('chats.maxTokens'));
    qs(this.shadowRoot, '.max-tokens').value = String(defaults.maxTokens ?? 4096);
    qs(this.shadowRoot, '.thinking').setAttribute('label', t('chats.thinking'));
    qs(this.shadowRoot, '.thinking').options = [{ value: 'none', label: t('chats.none') }, { value: 'low', label: t('chats.low') }, { value: 'medium', label: t('chats.medium') }, { value: 'high', label: t('chats.high') }];
    qs(this.shadowRoot, '.thinking').value = defaults.thinking || 'none';
    qs(this.shadowRoot, '.web-search').setAttribute('label', t('chats.webSearch'));
    qs(this.shadowRoot, '.web-search').options = [{ value: 'false', label: t('chats.disabled') }, { value: 'true', label: t('chats.enabled') }];
    qs(this.shadowRoot, '.web-search').value = String(Boolean(defaults.webSearch));
    const key = store.getState().keyDrafts[defaults.providerId] || '';
    qs(this.shadowRoot, '.api-key').setAttribute('label', t('chats.apiKey'));
    qs(this.shadowRoot, '.api-key').setAttribute('placeholder', t('chats.apiKeyOptional'));
    qs(this.shadowRoot, '.api-key').value = key;
    provider.setAttribute('label', t('chats.provider'));
    qs(this.shadowRoot, '.model-label').textContent = t('chats.model');
    qs(this.shadowRoot, '.parameter-title').textContent = t('chats.parameters');
    qs(this.shadowRoot, '.save-config').textContent = t('chats.save');
  }

  async _send() {
    const input = qs(this.shadowRoot, '.composer');
    const content = input.value.trim();
    if (!content || !store.getState().activeId) return;
    input.value = '';
    const state = store.getState();
    await sendUserMessage(content, state.config?.defaults || {});
  }

  async _newChat() {
    const dialog = document.createElement('ui-dialog');
    dialog.setAttribute('title', t('chats.newChat'));
    dialog.setAttribute('width', 'sm');
    const input = document.createElement('ui-input');
    input.setAttribute('label', t('chats.chatName'));
    input.setAttribute('placeholder', t('chats.chatNamePlaceholder'));
    dialog.appendChild(input);
    const footer = document.createElement('div');
    footer.slot = 'footer';
    const cancel = document.createElement('ui-button');
    cancel.setAttribute('variant', 'secondary');
    cancel.textContent = t('common.cancel');
    const create = document.createElement('ui-button');
    create.textContent = t('common.create');
    footer.append(cancel, create);
    dialog.appendChild(footer);
    this.shadowRoot.appendChild(dialog);
    const close = () => dialog.remove();
    dialog.addEventListener('close', close, { once: true });
    cancel.onclick = close;
    create.onclick = async () => { if (!input.value.trim()) return; await createChat(input.value.trim()); dialog.close(); };
    dialog.openDialog();
  }

  async _deleteChat(id) {
    if (!await confirmDialog({ title: t('chats.confirmDelete'), message: t('chats.deleteConfirmMsg'), confirmText: t('common.delete'), cancelText: t('common.cancel'), variant: 'destructive' })) return;
    try { await removeChat(id); toast.success(t('chats.deleted')); } catch { toast.error(t('common.error')); }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .heading h1 { font-size: var(--text-2xl); font-weight: 700; }
  .heading p { margin-top: var(--spacing-1); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
  .layout { display: grid; grid-template-columns: var(--chat-inbox-width) minmax(0, 1fr) var(--chat-params-width); gap: var(--spacing-3); min-width: 0; }
  .inbox, .thread-pane, .params { min-width: 0; padding: var(--spacing-3); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); }
  .inbox { display: grid; align-content: start; gap: var(--spacing-2); }
  .inbox-head, .param-head, .composer-row, .message-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
  .inbox-title, .parameter-title { font-size: var(--text-sm); font-weight: 600; }
  .new-chat { width: 100%; padding: var(--spacing-2); border: 0; border-radius: var(--radius); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); cursor: pointer; font-size: var(--text-sm); }
  .views { display: grid; gap: var(--spacing-1); }
  .view { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-2); border: 0; border-radius: var(--radius); background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer; text-align: start; font-size: var(--text-sm); }
  .view:hover, .view.active { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
  .search { width: 100%; }
  .conversation-list { display: grid; gap: var(--spacing-1); }
  .conversation { display: flex; align-items: center; gap: var(--spacing-1); border-radius: var(--radius); background: transparent; }
  .conversation.active, .conversation:hover { background: hsl(var(--accent)); }
  .conversation-main { min-width: 0; flex: 1; display: grid; gap: var(--spacing-1); padding: var(--spacing-2); border: 0; background: transparent; color: hsl(var(--foreground)); text-align: start; cursor: pointer; }
  .conversation-title, .conversation-preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .conversation-title { font-size: var(--text-sm); font-weight: 500; }
  .conversation-preview { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
  .conversation-delete, .copy { display: inline-flex; align-items: center; justify-content: center; width: var(--spacing-8); height: var(--spacing-8); border: 0; border-radius: var(--radius); background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer; }
  .conversation-delete:hover, .copy:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / .1); }
  .thread-pane { display: grid; grid-template-rows: minmax(var(--chat-thread-min-height), 1fr) auto; gap: var(--spacing-3); }
  .thread { display: grid; align-content: start; gap: var(--spacing-3); }
  .message { display: grid; gap: var(--spacing-2); max-width: 88%; padding: var(--spacing-3); border-radius: var(--radius-lg); background: hsl(var(--muted)); }
  .message.user { justify-self: end; background: hsl(var(--primary) / .1); }
  .message-head span { display: inline-flex; align-items: center; gap: var(--spacing-1); color: hsl(var(--muted-foreground)); font-size: var(--text-xs); font-weight: 600; }
  .message p { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: var(--text-sm); }
  .composer-row { align-items: end; }
  .composer { flex: 1; }
  .attach { width: var(--spacing-8); height: var(--spacing-8); border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: transparent; cursor: pointer; }
  .send { padding: var(--spacing-2) var(--spacing-3); border: 0; border-radius: var(--radius); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); cursor: pointer; }
  .send:disabled { opacity: .5; cursor: not-allowed; }
  .params { display: grid; align-content: start; gap: var(--spacing-3); }
  .params ui-input, .params ui-select { width: 100%; }
  .save-config { width: 100%; padding: var(--spacing-2); border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--background)); cursor: pointer; }
  .save-config:hover { background: hsl(var(--accent)); }
  .error { padding: var(--spacing-2) var(--spacing-3); color: hsl(var(--destructive)); background: hsl(var(--destructive) / .1); border-radius: var(--radius); font-size: var(--text-xs); }
  @media (max-width: 64rem) { .layout { grid-template-columns: var(--chat-inbox-width) minmax(0, 1fr); } .params { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); } .param-head, .save-config { grid-column: 1 / -1; } }
  @media (max-width: 39.99rem) { .layout { grid-template-columns: 1fr; } .thread-pane { min-height: var(--chat-mobile-min-height); } .params { grid-column: auto; grid-template-columns: 1fr; } .param-head, .save-config { grid-column: auto; } }
</style>
<div class="page"><header class="heading"><h1 class="title"></h1><p class="description"></p></header><div class="layout"><aside class="inbox"><div class="inbox-head"><span class="inbox-title"></span></div><button type="button" class="new-chat"></button><ui-input class="search" type="search"></ui-input><nav class="views"></nav><div class="conversation-list"></div></aside><section class="thread-pane"><div class="thread"></div><div class="composer-row"><button type="button" class="attach"><ui-icon name="paperclip" size="sm"></ui-icon></button><ui-input class="composer" multiline rows="3"></ui-input><button type="button" class="send"></button><input class="file-input" type="file" hidden></div></section><aside class="params"><div class="param-head"><span class="parameter-title"></span><ui-icon name="sliders-horizontal" size="sm"></ui-icon></div><ui-select class="provider"></ui-select><ui-input class="model" type="text"></ui-input><ui-input class="api-key" type="password"></ui-input><ui-input class="temperature" data-param="temperature" type="number"></ui-input><ui-input class="top-p" data-param="topP" type="number"></ui-input><ui-input class="max-tokens" data-param="maxTokens" type="number"></ui-input><ui-select class="thinking"></ui-select><ui-select class="web-search"></ui-select><button type="button" class="save-config"></button></aside></div><p class="error" hidden></p></div>
`;

define('chats-view', ChatsView);
