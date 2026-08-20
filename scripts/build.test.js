import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');


test('production build includes shared browser modules', () => {
  const result = spawnSync(process.execPath, ['scripts/build.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(join(ROOT, 'dist/shared/constants.js')), true);
  assert.equal(existsSync(join(ROOT, 'dist/shared/validation.js')), true);
  assert.equal(existsSync(join(ROOT, 'dist/shared/constants.test.js')), false);
});
