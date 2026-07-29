#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/청년도약계좌-2년차-소득-6500만-변동-기여금-중도해지-손익.md',
  'src/content/articles/living/장마철-빨래-3일째-안-말라서-쉰내-나는데-다시-빨아야-하나.md',
  'src/content/articles/auto/중앙선-침범-벌점-단계별-가이드.md',
  'src/content/articles/travel/해외여행-중-병원비-20만-원-나왔는데-다녀와서-청구되나.md',
  'src/content/articles/study/중3-여름방학-40일-내신-4등급-2등급까지-올릴-수-있나.md',
  'src/content/articles/finance/청년도약계좌-3년차-중도해지-실수령-계산.md',
  'src/content/articles/living/장마철-실내-습도-78퍼센트-제습기-24시간-켜도-되나.md',
  'src/content/articles/auto/차-계기판-엔진-경고등-노란색-켜졌는데-계속-타도-되나.md',
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
