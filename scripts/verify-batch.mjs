#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체(~습니다체 폭넓게).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/출산-휴가-공제-어떻게-신청할까.md',
  'src/content/articles/living/전입신고-정부24-인터넷-단계.md',
  'src/content/articles/auto/회생-제동-기능-이해하기.md',
  'src/content/articles/study/초5-여름방학-40일-방문학습지에서-학원으로-바꿔야-하나.md',
  'src/content/articles/finance/카드-할부-6개월-남았는데-일시불로-갚으면-이자-환급되나.md',
  'src/content/articles/living/콩국수-황금-레시피와-응용.md',
  'src/content/articles/study/초등-4학년-여름방학-학원-안-다니면-뒤처지나.md',
  'src/content/articles/finance/코인-지갑-시작-전-체크할-4가지.md',
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
  // ~습니다체 폭넓게 카운트(합니다/습니다/됩니다/입니다/봅니다 등)
  const hab = (body.match(/[가-힣]습니다|합니다|됩니다|입니다/g) || []).length;
  const pass = yamlOk === true && tlen >= 3100 && tables >= 1 && hab > 5;
  if (!pass) allPass = false;
  const name = rel.split('/').pop();
  console.log(`${pass ? 'PASS' : 'FAIL'} | tlen ${tlen} | tables ${tables} | 습니다 ${hab} | yaml ${yamlOk} | ${name}`);
}
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
process.exit(allPass ? 0 : 1);
