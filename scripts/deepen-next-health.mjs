#!/usr/bin/env node
// 심화 캠페인(health) 다음 배치 선정. deepen-health-done.txt 에 없는 health 글을 N개.
// 사용: node scripts/deepen-next-health.mjs [N=8]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REL = 'src/content/articles';
const N = parseInt(process.argv[2] || '8', 10);

const donePath = join(ROOT, 'scripts', 'deepen-health-done.txt');
const done = new Set(
  existsSync(donePath)
    ? readFileSync(donePath, 'utf-8').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    : []
);

const dir = join(ROOT, REL, 'health');
let files = [];
try { files = readdirSync(dir); } catch { files = []; }
const pool = files
  .filter(f => f.endsWith('.md'))
  .map(f => `${REL}/health/${f}`)
  .filter(p => !done.has(p))
  .sort();

const picked = pool.slice(0, N);
process.stderr.write(`남은 health 미심화: ${pool.length}편 | 이번 배치: ${picked.length}편\n`);
process.stdout.write(picked.join('\n') + '\n');
