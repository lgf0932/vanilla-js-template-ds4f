/**
 * notes 模块语言包加载器（模块内共享；子模块与根入口复用同一份语言包）。
 */
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