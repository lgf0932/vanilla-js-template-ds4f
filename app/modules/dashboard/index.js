/**
 * dashboard 模块入口。
 * 模块契约：mount(el, ctx) 挂载视图；loadLocale(lang) 随模块懒加载拉取语言包。
 */

import './components/dashboard-view.js';
import { store } from './store.js';

/** 挂载仪表盘视图到容器 */
export function mount(el) {
  const view = document.createElement('dashboard-view');
  el.appendChild(view);
  view.load();
}

/** 懒加载语言包（fetch .json，与模块 JS 同一次路由懒加载触发） */
export async function loadLocale(lang) {
  try {
    const res = await fetch(new URL(`./locales/${lang}.json`, import.meta.url), {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export { store };