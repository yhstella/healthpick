#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/중개-수수료-계산-신청-절차와-서류.md',
  'src/content/articles/living/위층-발소리-야간-3개월-관리사무소-vs-이웃사이센터-결정-기준.md',
  'src/content/articles/auto/전기차-전환지원금-100만원-2026-신설.md',
  'src/content/articles/travel/한옥-스테이-처음-가도-알차게.md',
  'src/content/articles/study/중2-여름방학-40일-수학-선행-미적분-시작해도-되나.md',
  'src/content/articles/finance/중소기업-청년-전세대출-누가-어떻게-받을-수-있나.md',
  'src/content/articles/living/인덕션-전원-안켜짐-셀프-점검-순서.md',
  'src/content/articles/auto/전기차-화재안심보험-100억-2026-도입.md',
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
