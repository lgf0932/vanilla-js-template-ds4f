import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function collectJavaScriptFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) collectJavaScriptFiles(path, files);
    else if (path.endsWith('.js')) files.push(path);
  }
  return files;
}

function relativeImportFailures(file) {
  const source = readFileSync(file, 'utf8');
  const failures = [];
  for (const match of source.matchAll(/(?:from|import)\s*['"](\.[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), match[1]);
    const candidates = [target, `${target}.js`, join(target, 'index.js')];
    if (!candidates.some((candidate) => statSync(candidate, { throwIfNoEntry: false })?.isFile())) {
      failures.push(`${file}: ${match[1]}`);
    }
  }
  return failures;
}

test('lazy-loaded app modules have resolvable relative imports', () => {
  const failures = collectJavaScriptFiles(ROOT).flatMap(relativeImportFailures);
  assert.deepEqual(failures, []);
});
