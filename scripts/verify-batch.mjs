#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/청년-주택드림-청약통장-2026-가입조건.md',
  'src/content/articles/living/장마-오기-전-집-정리-곰팡이-누수-막는-8가지.md',
  'src/content/articles/auto/전자식-주차-브레이크-어떤-상황에서-유용할까.md',
  'src/content/articles/travel/항공권-4-5개월-전-예약-2026-9월-일본-베트남-7월-가격.md',
  'src/content/articles/study/중2-여름방학-반-지났는데-수학-손도-못-댔으면-2학기-힘드나.md',
  'src/content/articles/finance/청년도약계좌-2026-달라진-5가지.md',
  'src/content/articles/living/장마-지나고-벽지-모서리-부풀어-오르는데-시간이-지나면-붙나.md',
  'src/content/articles/auto/중대형-전기화물차-보조금-2026-신규-1톤-포터-ev-자영업자-실혜택.md',
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
