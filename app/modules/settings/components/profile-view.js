/**
 * settings 模块私有组件：<profile-view>
 * 用户资料表单。敏感字段（姓名/邮箱/电话/地址等）落库前由后端 service 加密
 * （shared/constants.js SETTING_KEYS.PROFILE + AES-GCM），前端只处理明文。
 */

import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { t } from '../../../core/i18n.js';
import { toast } from '../../../components/ui/index.js';
import { validate, schemas, i18nErrors } from '../../../lib/validate.js';
import { loadProfile, saveProfile, store } from '../store.js';

const GENDERS = [
  { value: '', label: '—' },
  { value: 'male', label: t('settings.profile.genderMale') },
  { value: 'female', label: t('settings.profile.genderFemale') },
  { value: 'other', label: t('settings.profile.genderOther') },
];

class ProfileView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    qs(this.shadowRoot, '.box').setAttribute('title', t('settings.profile.title'));

    const labels = {
      username: t('settings.profile.username'),
      name: t('settings.profile.name'),
      gender: t('settings.profile.gender'),
      age: t('settings.profile.age'),
      email: t('settings.profile.email'),
      phone: t('settings.profile.phone'),
      address: t('settings.profile.address'),
    };
    for (const input of qsa(this.shadowRoot, 'ui-input')) {
      input.setAttribute('label', labels[input.id] || '');
    }
    qs(this.shadowRoot, '#gender').setAttribute('label', labels.gender);

    const select = qs(this.shadowRoot, '#gender');
    select.options = GENDERS;

    qs(this.shadowRoot, '.save').addEventListener('click', () => this._save());
  }

  async load() {
    try {
      const profile = await loadProfile();
      this._fill(profile || {});
    } catch {
      toast.error(t('common.error'));
    }
  }

  _fill(profile) {
    for (const input of qsa(this.shadowRoot, 'ui-input')) {
      input.value = profile[input.id] ?? '';
      input.removeAttribute('error');
    }
    const select = qs(this.shadowRoot, '#gender');
    select.value = profile.gender || '';
  }

  async _save() {
    const data = {};
    for (const input of qsa(this.shadowRoot, 'ui-input')) data[input.id] = input.value;
    data.gender = qs(this.shadowRoot, '#gender').value;

    const errors = validate(data, schemas.profile);
    if (Object.keys(errors).length) {
      const msgs = i18nErrors(errors, t, 'common.validation');
      for (const input of qsa(this.shadowRoot, 'ui-input')) {
        input.setAttribute('error', msgs[input.id] || '');
      }
      return;
    }

    const btn = qs(this.shadowRoot, '.save');
    btn.setAttribute('loading', '');
    try {
      await saveProfile(data);
      toast.success(t('common.saveSuccess'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      btn.removeAttribute('loading');
    }
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .form { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: var(--spacing-3); }
  .footer { display: flex; justify-content: flex-end; }
</style>
<div class="page">
  <ui-card class="box" title="">
    <span slot="header-extra"></span>
    <div class="form">
      <ui-input id="username"></ui-input>
      <ui-input id="name"></ui-input>
      <ui-select id="gender"></ui-select>
      <ui-input id="age" type="number"></ui-input>
      <ui-input id="email" type="email"></ui-input>
      <ui-input id="phone" type="tel"></ui-input>
      <ui-input id="address" style="grid-column: 1 / -1"></ui-input>
    </div>
    <div slot="footer" class="footer">
      <ui-button class="save" size="sm"></ui-button>
    </div>
  </ui-card>
</div>
`;

define('profile-view', ProfileView);