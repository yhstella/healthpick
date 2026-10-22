import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
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
  const runId = randomUUID();
  mkdirSync(drafts, { recursive: true });
  const unrelated = join(drafts, `unrelated-${runId}.txt`);
  writeFileSync(unrelated, 'An unrelated file must survive test cleanup.', { flag: 'wx' });
  try {
    for (const mode of ['success', 'exit', 'invalid-json', 'publishable', 'provider-error']) {
      const startFiles = new Set(draftFiles());
      const result = spawnSync('pwsh', [
        '-NoProfile', '-File', join(root, 'scripts/new-content-draft.ps1'),
        '-Topic', 'Test topic', '-ClaudeExecutable', join(root, 'tests/fixtures/claude-draft.ps1'),
      ], { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, HEALTHPICK_DRAFT_TEST_MODE: mode, HEALTHPICK_DRAFT_TEST_RUN_ID: runId } });
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
    // Only the mock provider's unique run marker establishes ownership.
    for (const file of draftFiles().filter((file) => file.endsWith('.result.json'))) {
      const result = join(drafts, file);
      if (!readFileSync(result, 'utf8').includes(runId)) continue;
      const draft = result.replace(/\.result\.json$/, '.draft.md');
      if (existsSync(draft)) unlinkSync(draft);
      unlinkSync(result);
    }
    try {
      assert.equal(readFileSync(unrelated, 'utf8'), 'An unrelated file must survive test cleanup.');
    } finally {
      if (existsSync(unrelated)) unlinkSync(unrelated);
    }
  }
});
