import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function collectJavaScriptFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    if (statSync(file).isDirectory()) collectJavaScriptFiles(file, files);
    else if (file.endsWith('.js')) files.push(file);
  }
  return files;
}

test('production build includes shared browser modules and valid JavaScript', () => {
  const result = spawnSync(process.execPath, ['scripts/build.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(join(ROOT, 'dist/shared/constants.js')), true);
  assert.equal(existsSync(join(ROOT, 'dist/shared/validation.js')), true);
  assert.equal(existsSync(join(ROOT, 'dist/shared/constants.test.js')), false);

  for (const file of collectJavaScriptFiles(join(ROOT, 'dist'))) {
    const syntax = spawnSync(process.execPath, ['--check', file], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(syntax.status, 0, `${file}\n${syntax.stderr || syntax.stdout}`);
  }
});
