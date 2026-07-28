#!/usr/bin/env node
// prune 대상 목록 출력 — 공격적 기준: len<2500 OR 조합형제목 OR 템플릿 리스티클.
// stdout 에 삭제할 파일 상대경로만 (git rm 파이프용). stderr 에 요약.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REL = 'src/content/articles';
const ART = join(ROOT, REL);
const CATS = ['health', 'living', 'finance', 'tech', 'auto', 'travel', 'study'];

function parse(txt) {
  const n = txt.replace(/\r\n/g, '\n');
  const e = n.indexOf('\n---', 3);
  const head = n.slice(0, e);
  const body = n.slice(e + 4);
  const get = (k) => {
    const m = head.match(new RegExp('^' + k + ':\\s*(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["\']|["\']$/g, '') : '';
  };
  return { body, get };
}
function tlen(b) {
  return b.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`|\-\[\]()!]/g, '')
    .replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').length;
}

const del = [];
const dist = {};
for (const c of CATS) {
  let files;
  try { files = readdirSync(join(ART, c)); } catch { continue; }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const { body, get } = parse(readFileSync(join(ART, c, f), 'utf-8'));
    const title = get('title');
    const len = tlen(body);
    const comb = /\bvs\b|결정\s*기준|비교|어느\s*게/i.test(title);
    const list = /\d+가지\s*(점검|정리)|예방을?\s*위한|미리\s*막는|주요\s*증상|체크리스트$|도움이?\s*되는\s*(음식|식품)|좋고\s*어떻게\s*시작/.test(title);
    if (len < 2500 || comb || list) {
      del.push(`${REL}/${c}/${f}`);
      dist[c] = (dist[c] || 0) + 1;
    }
  }
}
process.stderr.write(`prune 대상: ${del.length}편\n카테고리별: ${JSON.stringify(dist)}\n`);
process.stdout.write(del.join('\n') + '\n');
