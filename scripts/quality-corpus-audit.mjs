#!/usr/bin/env node
// 품질 총괄 감사 — Low value content 대응. 무엇을 prune/deepen 할지 판단용 실측.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ART = join(ROOT, 'src', 'content', 'articles');
const CATS = ['health', 'living', 'finance', 'tech', 'auto', 'travel', 'study'];

function fm(txt) {
  const n = txt.replace(/\r\n/g, '\n');
  const s = n.indexOf('\n', 3);
  const e = n.indexOf('\n---', s);
  const head = n.slice(0, e);
  const body = n.slice(e + 4);
  const get = (k) => {
    const m = head.match(new RegExp('^' + k + ':\\s*(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["\']|["\']$/g, '') : '';
  };
  return { head, body, get };
}
// 본문 순수 텍스트 길이 (마크다운/공백 제거)
function textLen(body) {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`|\-\[\]()!]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, '')
    .length;
}

const rows = [];
for (const cat of CATS) {
  let files;
  try { files = readdirSync(join(ART, cat)); } catch { continue; }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const txt = readFileSync(join(ART, cat, f), 'utf-8');
    const { head, body, get } = fm(txt);
    const title = get('title');
    const len = textLen(body);
    const hasTable = /\n\|.*\|.*\n\|[\s:|-]+\|/.test(body.replace(/\r\n/g, '\n'));
    const hasSources = /\nsources:\s*\n\s*-/.test(head.replace(/\r\n/g, '\n')) || /sources:\s*\[/.test(head);
    const combTitle = /\bvs\b|결정\s*기준|비교|어느\s*게/i.test(title);
    const listicleTitle = /\d+가지\s*(점검|정리)|예방을?\s*위한|미리\s*막는|주요\s*증상|체크리스트$|도움이?\s*되는\s*(음식|식품)|좋고\s*어떻게\s*시작/.test(title);
    const faqInBody = /##\s*자주\s*묻는/.test(body);
    rows.push({ cat, slug: f.replace(/\.md$/, ''), title, len, hasTable, hasSources, combTitle, listicleTitle });
  }
}

const N = rows.length;
const byCat = {};
for (const r of rows) byCat[r.cat] = (byCat[r.cat] || 0) + 1;
const lens = rows.map(r => r.len).sort((a, b) => a - b);
const pct = (p) => lens[Math.floor(lens.length * p)];
const thin = rows.filter(r => r.len < 2500);
const veryThin = rows.filter(r => r.len < 1800);
const comb = rows.filter(r => r.combTitle);
const listicle = rows.filter(r => r.listicleTitle);
const noTable = rows.filter(r => !r.hasTable);
const noSources = rows.filter(r => !r.hasSources);
const weak = rows.filter(r => r.len < 2500 && (r.combTitle || r.listicleTitle));

console.log('=== 총괄 ===');
console.log('총 글수:', N);
console.log('카테고리별:', JSON.stringify(byCat));
console.log('\n=== 본문 순수길이(자) 분포 ===');
console.log(`min ${lens[0]} / p10 ${pct(0.1)} / p25 ${pct(0.25)} / median ${pct(0.5)} / p75 ${pct(0.75)} / p90 ${pct(0.9)} / max ${lens[lens.length-1]}`);
console.log('\n=== 품질 플래그 ===');
console.log(`thin (<2500자): ${thin.length} (${(thin.length/N*100).toFixed(0)}%)`);
console.log(`very thin (<1800자): ${veryThin.length} (${(veryThin.length/N*100).toFixed(0)}%)`);
console.log(`조합형/비교 제목: ${comb.length} (${(comb.length/N*100).toFixed(0)}%)`);
console.log(`리스티클/템플릿 제목(N가지·예방·체크리스트 등): ${listicle.length} (${(listicle.length/N*100).toFixed(0)}%)`);
console.log(`표 없음: ${noTable.length} (${(noTable.length/N*100).toFixed(0)}%)`);
console.log(`출처 없음: ${noSources.length} (${(noSources.length/N*100).toFixed(0)}%)`);
console.log(`\n=== prune 1순위 후보 (thin AND 조합/리스티클 제목): ${weak.length}편 ===`);
console.log(`  카테고리별:`, JSON.stringify(weak.reduce((a,r)=>{a[r.cat]=(a[r.cat]||0)+1;return a;},{})));
console.log('\n샘플 20:');
weak.slice(0, 20).forEach(r => console.log(`  [${r.cat}] ${r.len}자 | ${r.title}`));
