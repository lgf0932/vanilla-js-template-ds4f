import { test } from 'node:test';
import assert from 'node:assert/strict';

// i18n is browser-first; provide only the globals needed during module initialization.
globalThis.localStorage ??= {
  getItem() {
    return null;
  },
  setItem() {},
};
globalThis.document ??= { documentElement: {} };

const { i18n } = await import('./i18n.js');

test('loadShell: 从嵌套路由加载根路径语言包且不使用旧缓存', async () => {
  const requested = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requested.push({ url, options });
    return new Response(JSON.stringify({ common: { role: { admin: 'Administrator' } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await i18n.loadShell();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requested[0].url, `/app/locales/${i18n.lang}.json`);
  assert.equal(requested[0].options.cache, 'no-store');
  assert.equal(i18n.t('common.role.admin'), 'Administrator');
});
