/**
 * settings 模块私有组件：<security-view>
 *  - 修改管理密码（旧密码校验 → PBKDF2 重哈希）
 *  - 默认会话时长：4/8/12/24 小时 + 7/14/30/90 天 + "直到下次浏览器打开"（架构 4.3 节 8+1 布局）
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../ui/base.js';
import { t } from '../../core/i18n.js';
import { toast } from '../../ui/index.js';
import { changePassword, setSessionDuration, loadSessionDefault, store } from '../store.js';
import { SESSION_DURATIONS } from '../../../shared/constants.js';

class SecurityView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    const cards = qsa(this.shadowRoot, 'ui-card');
    cards[0].setAttribute('title', t('settings.security.changePassword'));
    cards[1].setAttribute('title', t('settings.security.sessionTitle'));

    qs(this.shadowRoot, '.change-btn').addEventListener('click', () => this._changePassword());

    const grid = qs(this.shadowRoot, '.duration-grid');
    // 前 8 项：两行 × 每行 4 格；第 9 项跨整行的大按钮
    const top = SESSION_DURATIONS.slice(0, 8);
    const last = SESSION_DURATIONS[8];
    grid.innerHTML =
      top
        .map(
          (d) => `
        <button type="button" class="dur-btn" data-duration="${d.id}" data-pickable>
          ${escapeHtml(t(`auth.duration.${d.id}`))}
        </button>`,
        )
        .join('') +
      `
      <button type="button" class="dur-btn wide" data-duration="${last.id}" data-pickable>
        ${escapeHtml(t('auth.duration.session'))}
      </button>`;

    for (const btn of qsa(grid, '[data-pickable]')) {
      btn.addEventListener('click', async () => {
        try {
          await setSessionDuration(btn.dataset.duration);
          store.setState({ sessionDuration: btn.dataset.duration });
          this._markActive(btn.dataset.duration);
          toast.success(t('common.saveSuccess'));
        } catch {
          toast.error(t('common.error'));
        }
      });
    }

    store.subscribe(() => this.render());
  }

  async load() {
    try {
      await loadSessionDefault();
    } catch {
      /* 保持默认 */
    }
    this.render();
  }

  _markActive(duration) {
    for (const btn of qsa(this.shadowRoot, '.dur-btn')) {
      btn.classList.toggle('active', btn.dataset.duration === duration);
    }
  }

  render() {
    if (!this.shadowRoot) return;
    this._markActive(store.getState().sessionDuration);
  }

  async _changePassword() {
    const root = this.shadowRoot;
    const current = qs(root, '#current').value;
    const next = qs(root, '#new').value;
    const confirm = qs(root, '#confirm').value;

    qs(root, '#current').removeAttribute('error');
    qs(root, '#new').removeAttribute('error');
    qs(root, '#confirm').removeAttribute('error');

    if (!current || !next) {
      qs(root, '#current').setAttribute('error', t('common.validation.required'));
      return;
    }
    if (next.length < 8) {
      qs(root, '#new').setAttribute('error', t('auth.weakPassword'));
      return;
    }
    if (next !== confirm) {
      qs(root, '#confirm').setAttribute('error', t('auth.mismatch'));
      return;
    }

    const btn = qs(root, '.change-btn');
    btn.setAttribute('loading', '');
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      qs(root, '#current').value = '';
      qs(root, '#new').value = '';
      qs(root, '#confirm').value = '';
      toast.success(t('settings.security.passwordChanged'));
    } catch (err) {
      toast.error(err.body?.error === 'WRONG_PASSWORD' ? t('settings.security.wrongCurrent') : t('common.error'));
    } finally {
      btn.removeAttribute('loading');
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .form { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: var(--spacing-3);
    align-items: end; }
  .duration-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-2); }
  .dur-btn {
    padding: var(--spacing-3) var(--spacing-2); font-size: var(--text-sm); font-weight: 500;
    border-radius: var(--radius); border: 1px solid hsl(var(--border)); background: transparent;
    color: hsl(var(--foreground)); cursor: pointer; transition: all var(--duration-fast) var(--ease-out);
  }
  .dur-btn:hover { border-color: hsl(var(--ring) / .5); background: hsl(var(--accent)); }
  .dur-btn.active { border-color: hsl(var(--primary)); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .dur-btn.wide { grid-column: 1 / -1; }
  @media (max-width: 39.99rem) { .duration-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
<div class="page">
  <ui-card title="">
    <span slot="header-extra"></span>
    <div class="form">
      <ui-input id="current" type="password" label="" placeholder=""></ui-input>
      <ui-input id="new" type="password" label="" placeholder=""></ui-input>
      <ui-input id="confirm" type="password" label="" placeholder=""></ui-input>
      <ui-button class="change-btn" variant="secondary"></ui-button>
    </div>
  </ui-card>
  <ui-card title="">
    <span slot="header-extra"></span>
    <div class="duration-grid"></div>
  </ui-card>
</div>
`;

define('security-view', SecurityView);