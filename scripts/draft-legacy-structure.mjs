// 옛 H2 구조 글 (## 한눈에 보기 / 왜 이 질문이 생길까 / 핵심 답변 / 단계별 체크리스트 / 마지막 한마디)
// 200편을 draft:true 로 일괄 처리. Astro content collection 가 draft 글을 자동 제외하므로
// sitemap·rss·archive·category·검색 어디에도 노출 X. AdSense 가 site-wide quality 평가 시
// 그 200편을 무시. 통과 후 점진 마이그레이션 + draft:false 해제 예정.
//
// 사용:
//   node scripts/draft-legacy-structure.mjs --dry-run
//   node scripts/draft-legacy-structure.mjs

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');
const DRY_RUN = process.argv.includes('--dry-run');

// 옛 구조 시그널: 다음 금지 H2 중 하나라도 있으면 옛 구조 글
const LEGACY_H2 = /^## (한눈에 보기|왜 이 질문이 생길까|핵심 답변|단계별 체크리스트|마지막 한마디|핵심 정리|요약)$/m;

let scanned = 0;
let matched = 0;
let updated = 0;
const examples = [];

const cats = readdirSync(ARTICLES).filter((d) => {
  try { return statSync(join(ARTICLES, d)).isDirectory(); } catch { return false; }
});

for (const cat of cats) {
  const cdir = join(ARTICLES, cat);
  for (const f of readdirSync(cdir).filter((x) => x.endsWith('.md'))) {
    scanned++;
    const path = join(cdir, f);
    const content = readFileSync(path, 'utf8');
    if (!LEGACY_H2.test(content)) continue;
    matched++;
    // frontmatter 안에 draft 필드 있는지 확인 후 처리
    let newContent;
    if (/^draft:\s*true\s*$/m.test(content)) {
      continue; // 이미 draft:true
    } else if (/^draft:\s*false\s*$/m.test(content)) {
      newContent = content.replace(/^draft:\s*false\s*$/m, 'draft: true');
    } else {
      // draft 필드 없음 → frontmatter 끝 (--- 직전) 에 추가
      newContent = content.replace(/^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/, (m, fm, end) => {
        return fm + '\ndraft: true' + end;
      });
    }
    if (newContent === content) continue;
    updated++;
    if (examples.length < 5) examples.push(`${cat}/${f}`);
    if (!DRY_RUN) writeFileSync(path, newContent, 'utf8');
  }
}

console.log('\n=========================================');
console.log(`DRY_RUN   : ${DRY_RUN}`);
console.log(`scanned   : ${scanned}`);
console.log(`legacy H2 : ${matched}`);
console.log(`updated   : ${updated}`);
console.log('=========================================');
console.log('샘플 5편:');
for (const e of examples) console.log(`  ${e}`);
