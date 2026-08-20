/**
 * app/core/i18n.js
 * 国际化：zh-CN / zh-TW / en 三语言，壳层文案与模块文案均按需加载。
 * 语言包以 .json 文件存放（docs 约定），通过 fetch 按需拉取：
 *  - 壳层：app/locales/<lang>.json（bootstrap 启动时加载）
 *  - 模块：app/modules/<id>/locales/<lang>.json（随模块懒加载一起拉取）
 */

import { LANGUAGE_CODES } from '../../shared/constants.js';
import { loadJson } from './runtime.js';

const STORAGE_KEY = 'nova:lang';

function detectLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* file:// 某些浏览器会禁用存储，使用浏览器语言继续启动 */
  }
  if (saved && LANGUAGE_CODES.includes(saved)) return saved;
  const nav = (navigator.language || 'zh-CN').toLowerCase();
  if (nav.includes('tw') || nav.includes('hant')) return 'zh-TW';
  if (nav.startsWith('zh')) return 'zh-CN';
  return 'en';
}

class I18n {
  constructor() {
    this.lang = detectLanguage();
    /** @type {Record<string, any>} 全部已加载文案的合并映射（key 带模块命名空间前缀） */
    this.messages = {};
    this._listeners = new Set();
  }

  /** 加载壳层文案（common / sidebar / auth 命名空间） */
  async loadShell() {
    const msgs = await this._fetchPack(`/app/locales/${this.lang}.json`);
    Object.assign(this.messages, msgs || {});
    document.documentElement.lang = this.lang.toLowerCase().replace('_', '-');
    return this.messages;
  }

  /** 合并模块语言包（模块名称为命名空间前缀，如 notes.title） */
  merge(pack) {
    Object.assign(this.messages, pack || {});
  }

  /** 获取语言包（相对导入者目录的路径，由调用方保证） */
  async _fetchPack(url) {
    try {
      return await loadJson(url, import.meta.url);
    } catch {
      return null;
    }
  }

  /** 切换语言：重新加载壳层文案并广播变更（设置页语言选择调用） */
  async switch(lang) {
    if (!LANGUAGE_CODES.includes(lang) || lang === this.lang) return;
    this.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* file:// 存储不可用时仍允许本次页面切换 */
    }
    await this.loadShell();
    for (const fn of this._listeners) fn(this.lang);
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * 取文案：i18n.t('notes.list.empty')，支持 {name} 占位符。
   * 缺失时原样返回 key，便于发现漏翻译。
   */
  t(key, params = {}) {
    const value = key.split('.').reduce((o, k) => (o == null ? o : o[k]), this.messages);
    if (value == null) return key;
    return String(value).replace(/\{(\w+)\}/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m,
    );
  }
}

export const i18n = new I18n();
export const t = (key, params) => i18n.t(key, params);