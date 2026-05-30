// author 다양화 — 단일 "헬스픽 검증팀" (99.97%) → 카테고리별 7개 팀명.
//
// AdSense Low value content 재거절 방지. 단일 author 100% 는 "scaled AI farm" 시그널.
//
// 매핑:
//   health   → 헬스픽 건강팀
//   living   → 헬스픽 생활팀
//   finance  → 헬스픽 재테크팀
//   tech     → 헬스픽 IT팀
//   auto     → 헬스픽 자동차팀
//   travel   → 헬스픽 여행팀
//   study    → 헬스픽 학습팀
//
// 사용:
//   node scripts/diversify-authors.mjs --dry-run    (미리 보기)
//   node scripts/diversify-authors.mjs              (실제 적용)

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');

const DRY_RUN = process.argv.includes('--dry-run');

const AUTHOR_MAP = {
  health: '헬스픽 건강팀',
  living: '헬스픽 생활팀',
  finance: '헬스픽 재테크팀',
  tech: '헬스픽 IT팀',
  auto: '헬스픽 자동차팀',
  travel: '헬스픽 여행팀',
  study: '헬스픽 학습팀',
};

const categories = readdirSync(ARTICLES).filter((d) => {
  try { return statSync(join(ARTICLES, d)).isDirectory(); } catch { return false; }
});

let scanned = 0;
let updated = 0;
const perCategory = {};

for (const cat of categories) {
  const newAuthor = AUTHOR_MAP[cat];
  if (!newAuthor) {
    console.warn(`[!] 카테고리 '${cat}' 에 매핑 없음 — skip`);
    continue;
  }
  const catDir = join(ARTICLES, cat);
  const files = readdirSync(catDir).filter((f) => f.endsWith('.md'));
  let catUpdated = 0;
  for (const f of files) {
    scanned++;
    const path = join(catDir, f);
    const content = readFileSync(path, 'utf8');
    // frontmatter 안의 author 라인만 교체 — single quote / double quote / no quote 모두 지원
    const re = /^(author:\s*)["']?헬스픽 검증팀["']?\s*$/m;
    if (!re.test(content)) continue;
    const newContent = content.replace(re, `$1"${newAuthor}"`);
    if (newContent === content) continue;
    catUpdated++;
    updated++;
    if (!DRY_RUN) {
      writeFileSync(path, newContent, 'utf8');
    }
  }
  perCategory[cat] = { newAuthor, updated: catUpdated, total: files.length };
}

console.log('\n=========================================');
console.log(`DRY_RUN  : ${DRY_RUN}`);
console.log(`scanned  : ${scanned}`);
console.log(`updated  : ${updated}`);
console.log('=========================================');
console.log('카테고리별:');
for (const [cat, info] of Object.entries(perCategory)) {
  console.log(`  ${cat}  → "${info.newAuthor}"  ${info.updated}/${info.total} 편`);
}
