#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/청년월세-2차-신청-2026-5월-3월-탈락자-재신청-가능-기준.md',
  'src/content/articles/living/장마철-옷장-벽지-뒤-곰팡이-발견했는데-벽지만-갈면-되나.md',
  'src/content/articles/auto/캐스퍼-EV-EV6-코나-전환지원금-100만-2026-6월-신청-시점.md',
  'src/content/articles/travel/해외여행-중-여권-잃어버렸는데-며칠-안에-귀국할-수-있나.md',
  'src/content/articles/study/초1-받아쓰기-계속-반타작인데-여름방학-학원-보내야-하나.md',
  'src/content/articles/finance/청년월세지원-2026-5월-29일-마감.md',
  'src/content/articles/living/장마철-화장실-배수구에서-하수구-냄새-나는데-어떻게-해야-하나.md',
  'src/content/articles/auto/파노라마-루프-기능-이해하기.md',
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
