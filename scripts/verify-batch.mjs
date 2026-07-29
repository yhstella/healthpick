#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체(~습니다체 폭넓게).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/토지거래허가구역-실거주의무-2026-5월12일-세입자-확대.md',
  'src/content/articles/living/파김치-만드는-법-기본-레시피.md',
  'src/content/articles/study/초등-6학년-여름방학-40일-게임-하루-3시간-그냥-둬도-되나.md',
  'src/content/articles/finance/퇴직금-1억-IRP-이체-vs-일시금-세금-비교.md',
  'src/content/articles/living/폭염에-에어컨-실외기-자꾸-꺼지는데-고장-신호인가.md',
  'src/content/articles/study/토익-스피킹-매일-5분-루틴.md',
  'src/content/articles/finance/퇴직금-계산-한눈에-정리.md',
  'src/content/articles/study/피아노-독학-효과적으로-쓰는-법.md',
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
  const hab = (body.match(/[가-힣]습니다|합니다|됩니다|입니다/g) || []).length;
  const pass = yamlOk === true && tlen >= 3100 && tables >= 1 && hab > 5;
  if (!pass) allPass = false;
  const name = rel.split('/').pop();
  console.log(`${pass ? 'PASS' : 'FAIL'} | tlen ${tlen} | tables ${tables} | 습니다 ${hab} | yaml ${yamlOk} | ${name}`);
}
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
process.exit(allPass ? 0 : 1);
