#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/30대-안정시-맥박-95-운동-부족인가-다른-원인인가.md',
  'src/content/articles/health/5세대-실손-5월-6일-출시-60대-17만-vs-4.2만-1-4세대-6개월-철회.md',
  'src/content/articles/health/5세대-실손-도수치료-자기부담-50프로-실제-부담.md',
  'src/content/articles/health/5세대-실손보험-2026-5월6일-출시-4세대-비교.md',
  'src/content/articles/health/70대-부모-폭염에-새벽부터-두통-구토-응급실-가야-하나.md',
  'src/content/articles/health/alt-110-ast-32.md',
  'src/content/articles/health/ess-12점-수면시간-6시간-수면다원검사-의뢰-기준.md',
  'src/content/articles/health/hpv-남자청소년-2014년생-2026-5월-국가접종-가다실-9-시기.md',
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
