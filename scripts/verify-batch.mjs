#!/usr/bin/env node
// 배치 검증: YAML 파싱 + 순수본문 길이 + 표 개수 + 문체.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = 'E:/healthpick';
const files = [
  'src/content/articles/finance/정책대출-25-감축-6월-디딤돌-신청-대기-2026-하반기-한도.md',
  'src/content/articles/tech/크롬-캐시-비우기-한-번에-정리.md',
  'src/content/articles/living/여름철-에어컨-효율-구매-2026-5월-구형-10년-교체-전기료-절감액.md',
  'src/content/articles/auto/장마철-차-에어컨-식초-냄새-곰팡이-에어컨필터-셀프-vs-출장-청소.md',
  'src/content/articles/travel/제주도-렌터카-1박2일-자차보험-꼭-필요한가.md',
  'src/content/articles/study/조주기능사-한-달-학습-흐름.md',
  'src/content/articles/finance/종합소득세-2026-6월-1일-환급-언제-들어오나.md',
  'src/content/articles/tech/클릭-매크로-방법-단계별-가이드.md',
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
    .replace(/\|.*\|/g, '')            // 표행 제거
    .replace(/https?:\/\/\S+/g, '')    // URL 제거
    .replace(/[#>*`\-\[\]()!]/g, '')   // 마크다운 기호
    .replace(/\s+/g, '')               // 공백
    .length;
  const hab = (body.match(/합니다/g) || []).length;
  const handa = (body.match(/[^다]다\.(?!\s*\|)/g) || []).length;
  const pass = yamlOk === true && tlen >= 3100 && tables >= 1 && hab > 5;
  if (!pass) allPass = false;
  const name = rel.split('/').pop();
  console.log(`${pass ? 'PASS' : 'FAIL'} | tlen ${tlen} | tables ${tables} | 합니다 ${hab} | yaml ${yamlOk} | ${name}`);
}
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
process.exit(allPass ? 0 : 1);
