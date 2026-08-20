/**
 * app/core/theme.js
 * 三态暗黑模式（system / light / dark）：
 *  - system 监听 prefers-color-scheme 动态写入 <html data-theme>
 *  - light / dark 直接写死 data-theme
 *  - 持久化：localStorage 立即生效 + 防抖同步后端 app_settings 的 settings:display（跨设备）
 */

import { fetcher } from '../lib/fetcher.js';
import { i18n } from './i18n.js';

const MODES = ['system', 'light', 'dark'];
const STORAGE_KEY = 'nova:theme';

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

class Theme {
  constructor() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* file:// 某些浏览器禁用存储，使用 system 默认值 */
    }
    this.mode = MODES.includes(saved) ? saved : 'system';

    this._mql = window.matchMedia('(prefers-color-scheme: dark)');
    this._onSystemChange = () => {
      if (this.mode === 'system') this.apply();
    };
    this._mql.addEventListener?.('change', this._onSystemChange);
    this._persistTimer = null;

    this.apply();
  }

  /** 当前生效模式（system 会映射为 light/dark） */
  effective() {
    if (this.mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return this.mode;
  }

  /** 将生效模式写入 <html data-theme="...">（CSS 变量随之切换） */
  apply() {
    document.documentElement.dataset.theme = this.effective();
    window.dispatchEvent(new CustomEvent('theme:applied', { detail: { mode: this.mode } }));
  }

  setMode(mode) {
    if (!MODES.includes(mode)) return;
    this.mode = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* file:// 存储不可用时仍切换当前页面主题 */
    }
    this.apply();
    this._persist();
    window.dispatchEvent(new CustomEvent('theme:change', { detail: { mode } }));
  }

  /** 防抖同步到后端 settings:display（未鉴权/离线时静默失败） */
  _persist() {
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(async () => {
      try {
        await fetcher('/api/settings/display', {
          method: 'PUT',
          body: { theme: this.mode, language: i18n.lang },
        });
      } catch {
        /* 静默：仅在下次成功时再同步 */
      }
    }, 500);
  }
}

export const theme = new Theme();
export const themeModes = MODES;