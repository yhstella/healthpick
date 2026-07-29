#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/종합소득세-2026-신고-1인사업자-경비-차감-구간.md',
  'src/content/articles/tech/파워포인트-도식화-5분-안에-따라-하기.md',
  'src/content/articles/living/열대야-2주째-에어컨-밤새-켜는데-8월-전기세-20만-원-넘나.md',
  'src/content/articles/auto/장마철-차-침수-후-시동-걸어도-되나.md',
  'src/content/articles/travel/추자도-여행-1박-2일-일정-예시.md',
  'src/content/articles/study/주간-계획-작은-습관-만들기.md',
  'src/content/articles/finance/주담대-변동에서-고정-갈아타기-금리차-1프로-기준.md',
  'src/content/articles/tech/폰-물에-빠뜨렸는데-쌀통에-3일-넣으면-살아나나.md',
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
