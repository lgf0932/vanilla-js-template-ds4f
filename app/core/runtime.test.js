import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAsset } from './runtime.js';

test('resolveAsset: root-relative paths resolve beside index.html for file URLs', () => {
  assert.equal(
    resolveAsset('/app/core/bootstrap.js', 'file:///tmp/nova/index.html', true),
    'file:///tmp/nova/app/core/bootstrap.js',
  );
});

test('resolveAsset: root-relative paths stay root-relative for HTTP URLs', () => {
  assert.equal(resolveAsset('/app/core/bootstrap.js', 'https://nova.example/notes/list'), '/app/core/bootstrap.js');
});

test('resolveAsset: relative module paths preserve their importer directory', () => {
  assert.equal(
    resolveAsset('./locales/en.json', 'file:///tmp/nova/app/modules/notes/index.js'),
    'file:///tmp/nova/app/modules/notes/locales/en.json',
  );
});
