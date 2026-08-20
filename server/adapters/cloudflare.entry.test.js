import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './cloudflare.entry.js';

function fakeAssets() {
  const requests = [];
  return {
    requests,
    binding: {
      async fetch(request) {
        const url = new URL(request.url);
        requests.push(url.pathname);
        if (url.pathname === '/index.html') return new Response('<main>Nova</main>');
        if (url.pathname === '/public/favicon.svg') return new Response('<svg></svg>', { headers: { 'content-type': 'image/svg+xml' } });
        return new Response('missing', { status: 404 });
      },
    },
  };
}

test('Cloudflare entry serves existing Workers Assets', async () => {
  const assets = fakeAssets();
  const response = await worker.fetch(
    new Request('https://nova.test/public/favicon.svg'),
    { ASSETS: assets.binding },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<svg></svg>');
  assert.deepEqual(assets.requests, ['/public/favicon.svg']);
});

test('Cloudflare entry falls back to index.html for SPA routes', async () => {
  const assets = fakeAssets();
  const response = await worker.fetch(
    new Request('https://nova.test/notes/list'),
    { ASSETS: assets.binding },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<main>Nova</main>');
  assert.deepEqual(assets.requests, ['/notes/list', '/index.html']);
});

test('Cloudflare entry reports a missing Assets binding', async () => {
  const response = await worker.fetch(new Request('https://nova.test/'), {});

  assert.equal(response.status, 500);
  assert.equal(await response.text(), 'Static assets binding not configured');
});
