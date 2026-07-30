#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/건강보험료-2026-7-19-인상-월급-차이.md',
  'src/content/articles/health/고혈압-예방-약-없이-먼저-손볼-7가지.md',
  'src/content/articles/health/공복혈당-105-당뇨전단계-식이운동.md',
  'src/content/articles/health/공복혈당-105-당뇨전단계-체중-5kg-감량.md',
  'src/content/articles/health/공복혈당-110-당뇨-전단계.md',
  'src/content/articles/health/관상동맥-질환-예방-식단-운동-검진까지.md',
  'src/content/articles/health/근감소증-사르코페니아-40대부터-시작하는-8가지-예방-체크.md',
  'src/content/articles/health/근지구력-운동-초보-가이드-자세와-빈도.md',
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
