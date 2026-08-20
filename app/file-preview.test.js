import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./file-preview.js', import.meta.url), 'utf8');

test('file preview: is a classic standalone entry with no network auth request', () => {
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /^\s*export\s/m);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /AUTH_HEADER/);
  assert.match(source, /state\.notes/);
  assert.match(source, /state\.tags/);
  assert.match(source, /state\.conversations/);
  assert.match(source, /indexedDB/);
  assert.match(source, /void startPreview\(\)/);
});

test('file preview: exposes the same module routes and settings surface', () => {
  for (const path of ['notes/list', 'notes/tags', 'chat', 'settings/profile', 'settings/display', 'settings/security', 'settings/database']) {
    assert.match(source, new RegExp(path.replace('/', '\\/')));
  }
  for (const action of ['new-note', 'new-chat', 'data-profile-form', 'data-password-form', 'data-duration']) {
    assert.match(source, new RegExp(action));
  }
});
