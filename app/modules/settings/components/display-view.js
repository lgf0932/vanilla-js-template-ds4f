/**
 * settings 模块私有组件：<display-view>
 * 主题三态（与 app/core/theme.js 联动，实时生效并持久化） + 语言切换。
 */

import { define, attachTemplate, qs } from '../../../components/ui/base.js';
import { t, i18n } from '../../../core/i18n.js';
import { theme } from '../../../core/theme.js';
import { toast } from '../../../components/ui/index.js';
import { LANGUAGE_CODES } from '../../../../shared/constants.js';
import { saveDisplay, loadDisplay } from '../store.js';

class DisplayView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);

    qs(this.shadowRoot, 'ui-card').setAttribute('title', t('settings.display.title'));

    const themeGroup = qs(this.shadowRoot, '#theme');
    themeGroup.options = [
      { value: 'system', label: t('settings.display.themeSystem'), description: t('settings.display.themeSystemDesc') },
      { value: 'light', label: t('settings.display.themeLight'), description: t('settings.display.themeLightDesc') },
      { value: 'dark', label: t('settings.display.themeDark'), description: t('settings.display.themeDarkDesc') },
    ];
    themeGroup.addEventListener('change', (e) => {
      theme.setMode(e.detail.value); // 实时生效；theme._persist 会同步后端
    });
    window.addEventListener('theme:change', (e) => {
      themeGroup.value = e.detail.mode;
    });

    const langSelect = qs(this.shadowRoot, '#language');
    const labels = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English' };
    langSelect.options = LANGUAGE_CODES.map((code) => ({ value: code, label: labels[code] }));
    langSelect.addEventListener('change', async (e) => {
      await i18n.switch(e.detail.value);
      await saveDisplay({ theme: theme.mode, language: i18n.lang });
      toast.success(t('common.saveSuccess'));
    });
  }

  async load() {
    // sync current theme + language selection with backend-persisted values
    try {
      const data = await loadDisplay();
      if (data?.theme && ['system', 'light', 'dark'].includes(data.theme)) theme.setMode(data.theme);
      if (data?.language && LANGUAGE_CODES.includes(data.language) && data.language !== i18n.lang) {
        await i18n.switch(data.language);
      }
    } catch {
      /* 静默：使用本地默认 */
    }
    qs(this.shadowRoot, '#theme').value = theme.mode;
    qs(this.shadowRoot, '#language').value = i18n.lang;
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .row { display: grid; gap: var(--spacing-3); }
</style>
<div class="page">
  <ui-card title="">
    <span slot="header-extra"></span>
    <div class="row">
      <ui-radio-group id="theme" orientation="horizontal"></ui-radio-group>
      <ui-select id="language"></ui-select>
    </div>
  </ui-card>
</div>
`;

define('display-view', DisplayView);