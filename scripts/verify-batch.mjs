#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/명치-통증-4일째-소화제-안-듣는데-위내시경-해야-하나.md',
  'src/content/articles/health/무릎-계단-오를-때-시큰거림-3개월째-정형외과-가야-하나.md',
  'src/content/articles/health/바다-수영-후-귀-먹먹함-3일째-안-빠지는데-병원-가야-하나.md',
  'src/content/articles/health/발목-삐끗-5일-부종-압통-체중-못-실음-정형외과-가야-하나.md',
  'src/content/articles/health/발바닥-아침-첫-걸음-통증-4주째-병원-가야-하나.md',
  'src/content/articles/health/보건복지부-137조-2026-통합돌봄-전-지자체-확대-5월-신청-시군구.md',
  'src/content/articles/health/산후-우울-원인과-위험-요인-정리.md',
  'src/content/articles/health/소화불량-자가-관리에-좋은-음식과-식단.md',
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
