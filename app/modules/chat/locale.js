/**
 * chat 模块语言包加载器。
 */
export async function loadLocale(lang) {
  try {
    const res = await fetch(new URL(`./locales/${lang}.json`, import.meta.url), {
      headers: { accept: 'application/json' },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}