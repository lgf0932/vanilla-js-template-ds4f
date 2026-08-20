/**
 * app/components/layout/app-auth-gate.js
 * <app-auth-gate [expired]> — 统一的密码设置/输入页（路由守卫，未鉴权时任何路由都被拦截）。
 *  - 首次运行（后端无密码哈希）→ 设置初始密码 + 确认密码
 *  - 已有密码 → 输入密码登录
 *  - expired=true → 提示会话已过期
 * 会话时长选择：4h/8h/12h/24h、7d/14d/30d/90d、"直到下次浏览器打开"（ARCHITECTURE.md 4.3 节）。
 * 登录成功派发 auth:success（composed），bootstrap 据此挂载 app-shell。
 */

import { define, attachTemplate, qs } from '../ui/base.js';
import { auth } from '../../core/auth.js';
import { t } from '../../core/i18n.js';
import { isFileRuntime } from '../../core/runtime.js';
import { SESSION_DURATIONS } from '../../../shared/constants.js';

class AppAuthGate extends HTMLElement {
  static observedAttributes = ['expired'];

  async connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._bindEnter();

    if (isFileRuntime) {
      // 双击预览没有后端，直接进入内存预览模式，不发起 file:// API 请求。
      this._needsSetup = true;
    } else {
      // 探测是否需要初始化密码（公开只读接口，仅返回布尔，不含任何敏感信息）
      try {
        const res = await fetch('/api/auth/status', { headers: { accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        this._needsSetup = Boolean(data?.needsSetup);
      } catch {
        this._needsSetup = false;
      }
    }
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  _bindEnter() {
    // 监听 shadow 内部键盘回车（按钮内部的回车由按钮原生 click 语义处理）
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.target.closest('ui-button, button')) {
        e.preventDefault();
        this._submit();
      }
    });
    // 提交按钮点击
    qs(this.shadowRoot, 'ui-button').addEventListener('click', () => this._submit());
  }

  render() {
    if (!this.shadowRoot) return;
    const setup = this._needsSetup;
    const expired = this.getAttribute('expired') === 'true';

    qs(this.shadowRoot, '.title').textContent = setup
      ? t('auth.setupTitle')
      : expired
        ? t('auth.lockedTitle')
        : t('auth.title');
    qs(this.shadowRoot, '.subtitle').textContent = setup
      ? t('auth.setupSubtitle')
      : expired
        ? t('auth.lockedSubtitle')
        : t('auth.subtitle');
    const offlineNote = qs(this.shadowRoot, '.offline-note');
    offlineNote.hidden = !isFileRuntime;
    offlineNote.textContent = isFileRuntime ? t('auth.offlineNote') : '';

    const password = qs(this.shadowRoot, '#password');
    password.setAttribute('label', t('auth.passwordLabel'));
    password.setAttribute('placeholder', t('auth.passwordPlaceholder'));
    if (!setup) password.setAttribute('autocomplete', 'current-password');
    else password.removeAttribute('autocomplete');

    const confirm = qs(this.shadowRoot, '#confirm');
    confirm.closest('.confirm-field').hidden = !setup;
    if (setup) {
      confirm.setAttribute('label', t('auth.confirmPassword'));
      confirm.setAttribute('placeholder', t('auth.confirmPassword'));
    }

    qs(this.shadowRoot, 'ui-button').textContent = t('auth.loginBtn');

    const select = qs(this.shadowRoot, 'ui-select');
    select.setAttribute('label', t('auth.sessionDuration'));
    select.options = SESSION_DURATIONS.map((d) => ({ value: d.id, label: t(`auth.duration.${d.id}`) }));
    select.value = '8h';
  }

  async _submit() {
    const root = this.shadowRoot;
    const errEl = qs(root, '.error');
    const password = qs(root, '#password').value;

    if (!password || password.length < 8) {
      errEl.textContent = t('auth.weakPassword');
      return;
    }
    if (this._needsSetup && password !== qs(root, '#confirm').value) {
      errEl.textContent = t('auth.mismatch');
      return;
    }

    const btn = qs(root, 'ui-button');
    btn.setAttribute('loading', '');
    errEl.textContent = '';
    try {
      const duration = qs(root, 'ui-select').value;
      await auth.login(password, duration);
      this.dispatchEvent(new CustomEvent('auth:success', { bubbles: true, composed: true }));
    } catch (err) {
      errEl.textContent = err.message === 'auth.failed' ? t('auth.wrongPassword') : t('common.error');
    } finally {
      btn.removeAttribute('loading');
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: flex; align-items: center; justify-content: center; min-height: 100dvh; padding: var(--spacing-4);
    background: hsl(var(--background)); }
  .gate {
    width: 100%; max-width: var(--dialog-width-sm); display: grid; gap: var(--spacing-4);
    background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md); padding: var(--spacing-6);
  }
  .head { display: grid; justify-items: center; gap: var(--spacing-2); text-align: center; }
  .brand-icon { width: 3rem; height: 3rem; border-radius: var(--radius-lg); display: inline-flex; align-items: center;
    justify-content: center; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .title { font-size: var(--text-xl); font-weight: 700; }
  .subtitle { font-size: var(--text-sm); color: hsl(var(--muted-foreground)); }
  .offline-note { font-size: var(--text-xs); color: hsl(var(--muted-foreground)); text-align: center;
    padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius); background: hsl(var(--muted)); }
  .form { display: grid; gap: var(--spacing-3); }
  .error { font-size: var(--text-xs); color: hsl(var(--destructive)); min-height: 1em; text-align: center; }
</style>
<div class="gate" role="dialog" aria-modal="true">
  <div class="head">
    <span class="brand-icon"><ui-icon name="lock" size="xl"></ui-icon></span>
    <h1 class="title"></h1>
    <p class="subtitle"></p>
    <p class="offline-note" hidden></p>
  </div>
  <div class="form">
    <ui-input id="password" type="password" name="password"></ui-input>
    <div class="confirm-field" hidden>
      <ui-input id="confirm" type="password" name="confirm"></ui-input>
    </div>
    <ui-select id="duration"></ui-select>
    <p class="error" part="error"></p>
    <ui-button size="lg"></ui-button>
  </div>
</div>
`;

define('app-auth-gate', AppAuthGate);