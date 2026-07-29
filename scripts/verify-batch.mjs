#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/주택청약-5년-1순위-안되는-이유.md',
  'src/content/articles/tech/폴더블-2026-라인업-Z-플립7-폴드7-트라이폴드-1년차-우선순위.md',
  'src/content/articles/living/욕조-청소-제대로-하는-법.md',
  'src/content/articles/auto/전기차-보조금-2026-5월-잔여-물량-체크.md',
  'src/content/articles/travel/캠핑-요리-2-초보-가이드.md',
  'src/content/articles/study/중1-첫-중간고사-수학-60점인데-여름방학-40일에-잡히나.md',
  'src/content/articles/finance/주택청약-월-25만원-5년-납입-청년우대-가산-2026-기준.md',
  'src/content/articles/tech/폴더블-아이폰-2026-가을-출시-갤럭시-z-폴드-7-3년차-교체-시점.md',
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
