#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/청소년-가족카드-2026-5월-전-카드사-확대-부모-신용-한도-6월.md',
  'src/content/articles/living/전기요금-7월-누진3단계-월20만원-감축-실전.md',
  'src/content/articles/auto/폭염-3시간-주차-후-시동-걸자마자-출발해도-엔진-괜찮나.md',
  'src/content/articles/travel/홋카이도-7월-라벤더-매진-2026-후쿠오카-삿포로-우회-렌터카.md',
  'src/content/articles/study/초2-곱셈-구구단-두-달째-못-외우는데-병원-가야-하나.md',
  'src/content/articles/finance/청약-당첨됐는데-집단대출-막혀-잔금-못-치를-때-대처법.md',
  'src/content/articles/living/전세사기-특별법-개정-보증금-3분의1-보장.md',
  'src/content/articles/auto/폭염에-3시간-주차-후-에어컨-안-시원한데-냉매-부족인가.md',
];

let allPass = true;
for (const rel of files) {
  const raw = readFileSync(join(ROOT, rel), 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let yamlOk = false, body = raw;
  if (m) {
    try { yaml.load(m[1]); yamlOk = true; } catch (e) { yamlOk = 'ERR: ' + e.message; }
    body = m[2];
  }
  const tables = (body.match(/\n\|[\s:|-]+\|/g) || []).length;
  const tlen = body
    .replace(/\|.*\|/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*`\-\[\]()!]/g, '')
    .replace(/\s+/g, '')
    .length;
  const hab = (body.match(/합니다/g) || []).length;
  const pass = yamlOk === true && tlen >= 3100 && tables >= 1 && hab > 5;
  if (!pass) allPass = false;
  const name = rel.split('/').pop();
  console.log(`${pass ? 'PASS' : 'FAIL'} | tlen ${tlen} | tables ${tables} | 합니다 ${hab} | yaml ${yamlOk} | ${name}`);
}
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
process.exit(allPass ? 0 : 1);
