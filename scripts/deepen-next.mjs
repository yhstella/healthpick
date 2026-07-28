#!/usr/bin/env node
// 심화 캠페인 다음 배치 선정. deepen-done.txt 에 없는 non-medical 글을 카테고리 라운드로빈으로 N개.
// 사용: node scripts/deepen-next.mjs [N=8]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REL = 'src/content/articles';
const ART = join(ROOT, REL);
const CATS = ['finance', 'tech', 'living', 'auto', 'travel', 'study'];
const N = parseInt(process.argv[2] || '8', 10);

const donePath = join(ROOT, 'scripts', 'deepen-done.txt');
const done = new Set(
  existsSync(donePath)
    ? readFileSync(donePath, 'utf-8').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    : []
);

// 카테고리별 미완료 목록
const pools = {};
let remain = 0;
for (const c of CATS) {
  const dir = join(ART, c);
  let files = [];
  try { files = readdirSync(dir); } catch { continue; }
  pools[c] = files
    .filter(f => f.endsWith('.md'))
    .map(f => `${REL}/${c}/${f}`)
    .filter(p => !done.has(p))
    .sort();
  remain += pools[c].length;
}

// 라운드로빈으로 N개 뽑기 (카테고리 스프레드)
const picked = [];
let idx = 0;
while (picked.length < N) {
  let any = false;
  for (const c of CATS) {
    if (pools[c] && pools[c][idx]) {
      picked.push(pools[c][idx]);
      any = true;
      if (picked.length >= N) break;
    }
  }
  if (!any) break;
  idx++;
}

process.stderr.write(`남은 non-medical 미심화: ${remain}편 | 이번 배치: ${picked.length}편\n`);
process.stdout.write(picked.join('\n') + '\n');
