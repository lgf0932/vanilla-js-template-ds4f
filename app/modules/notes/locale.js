/**
 * notes 模块语言包加载器（模块内共享；子模块与根入口复用同一份语言包）。
 */
import { loadJson } from '../../core/runtime.js';

export async function loadLocale(lang) {
  try {
    return await loadJson(`./locales/${lang}.json`, import.meta.url);
  } catch {
    return null;
  }
}