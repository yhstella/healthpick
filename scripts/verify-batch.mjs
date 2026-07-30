#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/카페인-끊었는데-두근거림-2주째-병원-가야-하나.md',
  'src/content/articles/health/커프리스-혈압계-2026-진료지침-기존-자가측정-신뢰도-차이.md',
  'src/content/articles/health/콜레스테롤-240-나왔는데-3개월-운동으로-낮출-수-있나.md',
  'src/content/articles/health/콜레스테롤-ldl-145-약-시작해야-하나요.md',
  'src/content/articles/health/키트루다-위암-삼중음성유방암-2026-1월-급여-확대-5월-본인부담.md',
  'src/content/articles/health/한쪽-귀-이명-2주-청력-저하-50대-뇌MRI-시점-기준.md',
  'src/content/articles/health/항히스타민제-예방-식단-운동-검진까지.md',
  'src/content/articles/health/혈압-140-95-약-운동.md',
  'src/content/articles/health/혈압-145-90-약-시작-6주-점검.md',
  'src/content/articles/health/혈압-145-90-운동만으로-떨어질까.md',
  'src/content/articles/health/회복-기능성-원료-2026-트렌드-아쉬와간다-마그네슘-우선순위.md',
  'src/content/articles/health/휴식-심박수-95-bpm-카페인-하루-3잔-빈맥-진료-기준.md',
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
