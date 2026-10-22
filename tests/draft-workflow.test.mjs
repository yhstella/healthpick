import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const drafts = join(root, '.drafts');
const snapshot = () => createHash('sha256').update(JSON.stringify(readdirSync(join(root, 'src/content/articles/health')).sort().map((file) => [file, readFileSync(join(root, 'src/content/articles/health', file), 'utf8')]))).digest('hex');
const draftFiles = () => existsSync(drafts) ? readdirSync(drafts) : [];

test('retired generator fails without changing any article, including --clean', () => {
  const before = snapshot();
  for (const args of [[], ['--clean']]) {
    const result = spawnSync(process.execPath, ['scripts/generate-content.mjs', ...args], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /retired/);
  }
  assert.equal(snapshot(), before);
});

test('old scheduler entry points reject implicit generation', { skip: process.platform !== 'win32' }, () => {
  const before = snapshot();
  for (const file of ['daily-content.ps1', 'daily-content-3per-day.ps1']) {
    const result = spawnSync('pwsh', ['-NoProfile', '-File', join(root, 'scripts', file)], { cwd: root, encoding: 'utf8', timeout: 20000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Automatic publishing is retired/);
  }
  assert.equal(snapshot(), before);
});

test('draft workflow handles success, CLI failure and invalid results without publication', { skip: process.platform !== 'win32' }, () => {
  const before = snapshot();
  const existing = new Set(draftFiles());
  try {
    for (const mode of ['success', 'exit', 'invalid-json', 'publishable', 'provider-error']) {
      const startFiles = new Set(draftFiles());
      const result = spawnSync('pwsh', [
        '-NoProfile', '-File', join(root, 'scripts/new-content-draft.ps1'),
        '-Topic', 'Test topic', '-ClaudeExecutable', join(root, 'tests/fixtures/claude-draft.ps1'),
      ], { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, HEALTHPICK_DRAFT_TEST_MODE: mode } });
      const addedDrafts = draftFiles().filter((file) => !startFiles.has(file) && file.endsWith('.draft.md'));
      if (mode === 'success') {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.equal(addedDrafts.length, 1);
        assert.match(readFileSync(join(drafts, addedDrafts[0]), 'utf8'), /draft: true/);
      } else {
        assert.notEqual(result.status, 0, mode);
        assert.equal(addedDrafts.length, 0, mode);
      }
      assert.equal(snapshot(), before, mode);
    }
  } finally {
    for (const file of draftFiles().filter((file) => !existing.has(file))) unlinkSync(join(drafts, file));
  }
});
