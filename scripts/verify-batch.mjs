#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/ldl-콜레스테롤-어떤-음식을-챙길까.md',
  'src/content/articles/health/t-스코어-마이너스-2-0-폐경-2년차-골다공증-약-시작-시점.md',
  'src/content/articles/health/tsh-7-나왔는데-약-먹어야-하나-경계-수치-잡는-법.md',
  'src/content/articles/health/갑상선-결절-0-7cm-조직검사-필요한가.md',
  'src/content/articles/health/갑상선-결절-1-5cm-tirads-3-조직검사-생략-가능한가.md',
  'src/content/articles/health/갑상선결절-1.2cm-양성-추적주기-결정.md',
  'src/content/articles/health/갤럭시워치-심방세동-알림-떴는데-병원-진짜-가야-하나.md',
  'src/content/articles/health/건강검진-alt-80-바로-병원.md',
];

let allPass = true;
for (const rel of files) {
  const raw = readFileSync(join(ROOT, rel), 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let yamlOk = false, body = raw, medical = false;
  if (m) {
    try { const fm = yaml.load(m[1]); yamlOk = true; medical = fm && fm.medical === true; } catch (e) { yamlOk = 'ERR: ' + e.message; }
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
  const pass = yamlOk === true && tlen >= 3100 && tables >= 1 && hab > 5 && medical === true;
  if (!pass) allPass = false;
  const name = rel.split('/').pop();
  console.log(`${pass ? 'PASS' : 'FAIL'} | tlen ${tlen} | tbl ${tables} | 습니다 ${hab} | med ${medical} | yaml ${yamlOk} | ${name}`);
}
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
process.exit(allPass ? 0 : 1);
