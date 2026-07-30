#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/식후혈당-220-공복-95-가족력-40대-약-시작-기준.md',
  'src/content/articles/health/안구건조증-원인과-위험-요인-정리.md',
  'src/content/articles/health/알부민뇨-30-mg-g-당뇨-5년차-혈압-정상-신장내과-의뢰-기준.md',
  'src/content/articles/health/에어컨-방에서-잔-뒤-마른기침-2주째-병원-가야-하나.md',
  'src/content/articles/health/여름감기-3주째-마른기침-안-멎는데-폐렴-검사해야-하나.md',
  'src/content/articles/health/옆구리-살-빼기에-좋은-음식과-식단.md',
  'src/content/articles/health/외상-후-스트레스-장애-원인과-위험-요인-정리.md',
  'src/content/articles/health/요산-8-0-mg-dl-통풍-발작-없음-육식-주-3회-약-시작-기준.md',
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
