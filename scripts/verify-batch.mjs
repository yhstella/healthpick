#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체 + medical 필드 보존.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/health/지방간-2단계-진단-증상-없으면-그냥-둬도-될까.md',
  'src/content/articles/health/진드기-물린-자국-3일째-안-없어지는데-병원-가야-하나.md',
  'src/content/articles/health/진료실-130-85-가정-145-90-가면고혈압-약-시작-기준.md',
  'src/content/articles/health/철분제-2주-먹은-뒤-변이-까맣게-나오는데-정상인가.md',
  'src/content/articles/health/체지방-측정-예방-식단-운동-검진까지.md',
  'src/content/articles/health/총콜레스테롤-265-식이운동-약-시작-기준.md',
  'src/content/articles/health/출산-3개월-손목-시큰거리는데-정형외과-가야-하나.md',
  'src/content/articles/health/출산-후-4개월-머리카락-한-움큼씩-빠지는데-정상인가.md',
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
