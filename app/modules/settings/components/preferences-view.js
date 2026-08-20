import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { i18n, t } from '../../../core/i18n.js';
import { theme } from '../../../core/theme.js';
import { preferences } from '../../../core/preferences.js';
import { get, put } from '../../../lib/fetcher.js';
import { toast } from '../../../components/ui/index.js';

const NAV_ITEMS = [
  ['dashboard', 'dashboard', 'dashboard'], ['tasks', 'list-check', 'tasks'], ['notes', 'note', 'notes'],
  ['apps', 'package', 'apps'], ['chat', 'chat', 'chat'], ['chats', 'chat', 'chats'], ['docs', 'note', 'docs'], ['settings', 'settings', 'settings'],
];
const LLM_FALLBACK = {
  providers: [{ id: 'openrouter', name: 'OpenRouter', models: ['openai/gpt-4o-mini'], hasKey: false }],
  defaults: { providerId: 'openrouter', model: 'openai/gpt-4o-mini', temperature: 0.7, topP: 1, maxTokens: 4096, thinking: 'none', webSearch: false },
};

class PreferencesView extends HTMLElement {
  static observedAttributes = ['page'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._offI18n = i18n.onChange(() => this.render());
    this._offPreferences = preferences.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this._offI18n?.();
    this._offPreferences?.();
  }

  attributeChangedCallback() { this.render(); }

  get page() { return this.getAttribute('page') || 'account'; }

  render() {
    if (!this.shadowRoot) return;
    const state = preferences.getState();
    const copy = {
      account: ['settings.account.title', 'settings.account.desc'],
      appearance: ['settings.appearance.title', 'settings.appearance.desc'],
      notifications: ['settings.notifications.title', 'settings.notifications.desc'],
      display: ['settings.display.title', 'settings.display.desc'],
      llm: ['settings.llm.title', 'settings.llm.desc'],
    }[this.page] || ['settings.title', 'settings.title'];
    qs(this.shadowRoot, '.title').textContent = t(copy[0]);
    qs(this.shadowRoot, '.description').textContent = t(copy[1]);
    const body = qs(this.shadowRoot, '.body');
    body.innerHTML = this._body(state);
    this._bind(state);
  }

  _body(state) {
    if (this.page === 'account') return `<ui-card title="${escapeHtml(t('settings.account.card'))}"><div class="form"><ui-input data-field="name" label="${escapeHtml(t('settings.account.name'))}" value="${escapeHtml(state.account.name)}"></ui-input><ui-input data-field="dob" type="date" label="${escapeHtml(t('settings.account.dob'))}" value="${escapeHtml(state.account.dob)}"></ui-input><ui-select class="language" label="${escapeHtml(t('settings.account.language'))}"></ui-select></div><div slot="footer"><ui-button data-save>${escapeHtml(t('common.save'))}</ui-button></div></ui-card>`;
    if (this.page === 'appearance') return `<ui-card title="${escapeHtml(t('settings.appearance.theme'))}"><ui-radio-group class="theme" orientation="horizontal"></ui-radio-group></ui-card><ui-card title="${escapeHtml(t('settings.appearance.visual'))}"><div class="form"><ui-select class="base-color" label="${escapeHtml(t('settings.appearance.baseColor'))}"></ui-select><ui-select class="chart-color" label="${escapeHtml(t('settings.appearance.chartColor'))}"></ui-select><ui-select class="radius" label="${escapeHtml(t('settings.appearance.radius'))}"></ui-select><ui-select class="body-font" label="${escapeHtml(t('settings.appearance.bodyFont'))}"></ui-select><ui-select class="heading-font" label="${escapeHtml(t('settings.appearance.headingFont'))}"></ui-select><ui-select class="variant" label="${escapeHtml(t('settings.appearance.sidebarVariant'))}"></ui-select><ui-select class="collapse" label="${escapeHtml(t('settings.appearance.sidebarLayout'))}"></ui-select><ui-input class="width" type="number" label="${escapeHtml(t('settings.appearance.sidebarWidth'))}" hint="${escapeHtml(t('settings.appearance.sidebarWidthHint'))}"></ui-input></div></ui-card>`;
    if (this.page === 'notifications') return `<ui-card title="${escapeHtml(t('settings.notifications.notify'))}"><ui-radio-group class="notification-type"></ui-radio-group><div class="toggle-list">${['communication', 'marketing', 'social', 'security', 'mobile'].map((key) => `<button type="button" class="toggle ${state.notifications[key] ? 'active' : ''}" data-notification="${key}" aria-pressed="${state.notifications[key]}"><span><strong>${escapeHtml(t(`settings.notifications.${key}`))}</strong><small>${escapeHtml(t(`settings.notifications.${key}Desc`))}</small></span><ui-icon name="check" size="sm"></ui-icon></button>`).join('')}</div><div slot="footer"><ui-button data-save>${escapeHtml(t('common.save'))}</ui-button></div></ui-card>`;
    if (this.page === 'display') return `<ui-card title="${escapeHtml(t('settings.display.navTitle'))}"><p class="hint">${escapeHtml(t('settings.display.navHint'))}</p><div class="toggle-list nav-list">${NAV_ITEMS.map(([id, icon, key]) => { const hidden = state.hiddenNav.includes(id); return `<button type="button" class="toggle ${!hidden ? 'active' : ''}" data-nav="${id}" aria-pressed="${!hidden}"><span><strong><ui-icon name="${icon}" size="sm"></ui-icon>${escapeHtml(t(`sidebar.${key}`))}</strong><small>${id === 'settings' ? escapeHtml(t('settings.display.locked')) : escapeHtml(t('settings.display.canHide'))}</small></span><ui-icon name="${hidden ? 'x' : 'check'}" size="sm"></ui-icon></button>`; }).join('')}</div></ui-card>`;
    return `<ui-card title="${escapeHtml(t('settings.llm.providers'))}"><p class="hint">${escapeHtml(t('settings.llm.providerHint'))}</p><div class="form llm-form"><ui-select class="provider" label="${escapeHtml(t('settings.llm.provider'))}"></ui-select><ui-input class="model" label="${escapeHtml(t('settings.llm.model'))}"></ui-input><ui-input class="api-key" type="password" label="${escapeHtml(t('settings.llm.apiKey'))}" hint="${escapeHtml(t('settings.llm.apiKeyHint'))}"></ui-input><ui-input class="temperature" type="number" label="${escapeHtml(t('settings.llm.temperature'))}"></ui-input><ui-input class="max-tokens" type="number" label="${escapeHtml(t('settings.llm.maxTokens'))}"></ui-input></div><div slot="footer"><ui-button data-save-llm>${escapeHtml(t('common.save'))}</ui-button></div></ui-card>`;
  }

  _bind(state) {
    const body = qs(this.shadowRoot, '.body');
    if (this.page === 'account') {
      const language = qs(body, '.language');
      language.options = [{ value: 'zh-CN', label: '简体中文' }, { value: 'zh-TW', label: '繁體中文' }, { value: 'en', label: 'English' }];
      language.value = state.account.language || i18n.lang;
      qs(body, '[data-save]').addEventListener('click', () => {
        const account = { name: qs(body, '[data-field="name"]').value, dob: qs(body, '[data-field="dob"]').value, language: language.value };
        preferences.update({ account });
        if (account.language !== i18n.lang) i18n.switch(account.language);
        toast.success(t('common.saveSuccess'));
      });
      return;
    }
    if (this.page === 'appearance') return this._bindAppearance(body, state);
    if (this.page === 'notifications') return this._bindNotifications(body, state);
    if (this.page === 'display') return this._bindDisplay(body, state);
    this._bindLlm(body);
  }

  _bindAppearance(body, state) {
    const appearance = state.appearance;
    const themeGroup = qs(body, '.theme');
    themeGroup.options = [{ value: 'system', label: t('common.theme.system') }, { value: 'light', label: t('common.theme.light') }, { value: 'dark', label: t('common.theme.dark') }];
    themeGroup.value = theme.mode;
    themeGroup.addEventListener('change', (event) => theme.setMode(event.detail.value));
    const selects = {
      '.base-color': ['baseColor', ['neutral', 'stone', 'zinc', 'mauve', 'olive', 'mist', 'taupe']],
      '.chart-color': ['chartColor', ['amber', 'blue', 'cyan', 'emerald', 'fuchsia', 'green', 'indigo', 'lime', 'orange', 'pink', 'purple', 'red', 'rose', 'sky', 'teal', 'violet', 'yellow', 'zinc']],
      '.radius': ['radius', ['none', 'sm', 'md', 'lg', 'full', 'default']],
      '.body-font': ['bodyFont', ['system', 'inter', 'manrope']],
      '.heading-font': ['headingFont', ['system', 'inter', 'manrope']],
    };
    for (const [selector, [key, options]] of Object.entries(selects)) {
      const select = qs(body, selector); select.options = options.map((value) => ({ value, label: value })); select.value = appearance[key];
      select.addEventListener('change', (event) => preferences.update({ appearance: { ...preferences.getState().appearance, [key]: event.detail.value } }));
    }
    const variant = qs(body, '.variant'); variant.options = ['inset', 'floating', 'sidebar'].map((value) => ({ value, label: value })); variant.value = state.sidebarVariant; variant.addEventListener('change', (event) => preferences.update({ sidebarVariant: event.detail.value }));
    const collapse = qs(body, '.collapse'); collapse.options = [{ value: 'icon', label: t('settings.appearance.iconLayout') }, { value: 'offcanvas', label: t('settings.appearance.offcanvasLayout') }]; collapse.value = state.sidebarCollapsible; collapse.addEventListener('change', (event) => preferences.update({ sidebarCollapsible: event.detail.value }));
    const width = qs(body, '.width'); width.value = String(state.sidebarWidth); width.addEventListener('change', (event) => preferences.update({ sidebarWidth: Number(event.detail.value) }));
  }

  _bindNotifications(body, state) {
    const group = qs(body, '.notification-type'); group.options = [{ value: 'all', label: t('settings.notifications.all') }, { value: 'mentions', label: t('settings.notifications.mentions') }, { value: 'none', label: t('settings.notifications.none') }]; group.value = state.notifications.type; group.addEventListener('change', (event) => preferences.update({ notifications: { ...preferences.getState().notifications, type: event.detail.value } }));
    for (const button of qsa(body, '[data-notification]')) button.addEventListener('click', () => { const key = button.dataset.notification; preferences.update({ notifications: { ...preferences.getState().notifications, [key]: !preferences.getState().notifications[key] } }); });
    qs(body, '[data-save]').addEventListener('click', () => toast.success(t('common.saveSuccess')));
  }

  _bindDisplay(body, state) {
    for (const button of qsa(body, '[data-nav]')) button.addEventListener('click', () => { if (button.dataset.nav === 'settings') return; const hidden = new Set(preferences.getState().hiddenNav); hidden.has(button.dataset.nav) ? hidden.delete(button.dataset.nav) : hidden.add(button.dataset.nav); preferences.update({ hiddenNav: [...hidden] }); });
  }

  async _bindLlm(body) {
    if (!this._llm) {
      try { this._llm = await get('/api/chats/config'); } catch { this._llm = LLM_FALLBACK; }
      if (!this._llm?.providers) this._llm = LLM_FALLBACK;
      this.render(); return;
    }
    const config = this._llm;
    const provider = qs(body, '.provider'); provider.options = config.providers.map((item) => ({ value: item.id, label: `${item.name}${item.hasKey ? ' · ✓' : ''}` })); provider.value = config.defaults.providerId || config.providers[0]?.id || '';
    const selected = config.providers.find((item) => item.id === provider.value) || config.providers[0] || {};
    const model = qs(body, '.model'); model.value = config.defaults.model || selected.models?.[0] || '';
    qs(body, '.temperature').value = String(config.defaults.temperature ?? 0.7); qs(body, '.max-tokens').value = String(config.defaults.maxTokens ?? 4096);
    qs(body, '[data-save-llm]').addEventListener('click', async () => {
      try {
        const defaults = { ...config.defaults, providerId: provider.value, model: model.value, temperature: Number(qs(body, '.temperature').value), maxTokens: Number(qs(body, '.max-tokens').value) };
        const keys = {}; const key = qs(body, '.api-key').value.trim(); if (key) keys[provider.value] = key;
        this._llm = await put('/api/chats/config', { providers: config.providers, defaults, keys }); toast.success(t('settings.llm.saved'));
      } catch { toast.error(t('common.error')); }
    });
  }
}

const TEMPLATE = `<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .description, .hint { color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
  .body { display: grid; gap: var(--spacing-3); }
  .form { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-sm), 1fr)); gap: var(--spacing-3); }
  .theme { padding: var(--spacing-2); }
  .toggle-list { display: grid; gap: var(--spacing-2); margin-top: var(--spacing-3); }
  .toggle { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); width: 100%; padding: var(--spacing-3); border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--background)); color: hsl(var(--foreground)); text-align: start; cursor: pointer; }
  .toggle:hover, .toggle.active { background: hsl(var(--accent)); border-color: hsl(var(--ring) / .5); }
  .toggle > span { display: grid; gap: var(--spacing-1); min-width: 0; }
  .toggle strong { display: inline-flex; align-items: center; gap: var(--spacing-2); font-size: var(--text-sm); }
  .toggle small { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
  .nav-list { margin-top: 0; }
</style><div class="page"><header><h1 class="title"></h1><p class="description"></p></header><div class="body"></div></div>`;

define('preferences-view', PreferencesView);