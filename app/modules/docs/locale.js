import { loadJson } from '../../core/runtime.js';

export async function loadLocale(lang) {
  try {
    return await loadJson(`./locales/${lang}.json`, import.meta.url);
  } catch {
    return null;
  }
}