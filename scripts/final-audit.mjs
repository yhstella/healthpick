#!/usr/bin/env node
// 재심사 전 전수 감사: 354편 전체 YAML·표·길이·문체·금지어·템플릿버그·medical 확인.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from '../node_modules/js-yaml/index.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ART = join(ROOT, 'src/content/articles');
const CATS = ['finance', 'tech', 'living', 'auto', 'travel', 'study', 'health'];

// 심화 완료 목록
const done = new Set();
for (const f of ['scripts/deepen-done.txt', 'scripts/deepen-health-done.txt']) {
  const p = join(ROOT, f);
  if (existsSync(p)) readFileSync(p, 'utf-8').split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(s => done.add(s));
}

const BANNED = ['본 글', '이 글에서는', '결론적으로', '종합하면'];
const issues = { yaml: [], noTable: [], short: [], banned: [], template: [], notMedical: [], notDeepened: [], style: [] };
let total = 0;
const byCat = {};

for (const cat of CATS) {
  let files = [];
  try { files = readdirSync(join(ART, cat)).filter(f => f.endsWith('.md')); } catch { continue; }
  byCat[cat] = files.length;
  for (const f of files) {
    total++;
    const rel = `src/content/articles/${cat}/${f}`;
    const raw = readFileSync(join(ART, cat, f), 'utf-8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!done.has(rel)) issues.notDeepened.push(rel);
    if (!m) { issues.yaml.push(rel + ' (frontmatter 없음)'); continue; }
    let fm;
    try { fm = yaml.load(m[1]); } catch (e) { issues.yaml.push(`${rel} :: ${e.message.split('\n')[0]}`); continue; }
    const body = m[2];

    const tables = (body.match(/\n\|[\s:|-]+\|/g) || []).length;
    if (tables < 1) issues.noTable.push(rel);

    const tlen = body.replace(/\|.*\|/g, '').replace(/https?:\/\/\S+/g, '')
      .replace(/[#>*`\-\[\]()!]/g, '').replace(/\s+/g, '').length;
    if (tlen < 2900) issues.short.push(`${rel} (${tlen})`);

    const hit = BANNED.filter(b => body.includes(b));
    if (hit.length) issues.banned.push(`${rel} :: ${hit.join(',')}`);

    if (raw.includes('{topic}') || raw.includes('{{')) issues.template.push(rel);

    const hab = (body.match(/[가-힣]습니다|합니다|됩니다|입니다/g) || []).length;
    if (hab < 15) issues.style.push(`${rel} (습니다 ${hab})`);

    if (cat === 'health' && fm.medical !== true) issues.notMedical.push(rel);
  }
}

console.log('== 카테고리별 글 수 ==');
for (const [k, v] of Object.entries(byCat)) console.log(`  ${k}: ${v}`);
console.log(`  총: ${total}\n`);

const labels = {
  yaml: 'YAML 파싱 실패', noTable: '표 없음', short: '순수본문 짧음(<2900)',
  banned: '금지 상투어', template: '템플릿 플레이스홀더 잔여', notMedical: 'health인데 medical!=true',
  notDeepened: '심화 목록에 없음', style: '경어체 카운트 낮음(<15)',
};
let clean = true;
for (const [k, list] of Object.entries(issues)) {
  if (list.length) {
    clean = false;
    console.log(`❌ ${labels[k]}: ${list.length}건`);
    list.slice(0, 12).forEach(x => console.log(`   - ${x}`));
    if (list.length > 12) console.log(`   ... 외 ${list.length - 12}건`);
  }
}
console.log(clean ? '\n✅ 전수 감사 통과 — 이슈 없음' : '\n⚠️ 위 항목 확인 필요');
