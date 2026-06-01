// 어제 draft:true 처리한 옛 H2 구조 200편을 일괄 draft:false 롤백.
// 사유: GSC 데이터 보니 상위 노출 글 중 다수가 draft 됨 → 검색 트래픽 손실 + 404 발생.
// 옛 구조 자체보다 traffic 손실이 AdSense 평가 더 큰 타격.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');
const DRY_RUN = process.argv.includes('--dry-run');

const LEGACY_H2 = /^## (한눈에 보기|왜 이 질문이 생길까|핵심 답변|단계별 체크리스트|마지막 한마디|핵심 정리|요약)$/m;

let updated = 0;
const cats = readdirSync(ARTICLES).filter((d) => {
  try { return statSync(join(ARTICLES, d)).isDirectory(); } catch { return false; }
});

for (const cat of cats) {
  const cdir = join(ARTICLES, cat);
  for (const f of readdirSync(cdir).filter((x) => x.endsWith('.md'))) {
    const path = join(cdir, f);
    const content = readFileSync(path, 'utf8');
    if (!LEGACY_H2.test(content)) continue;
    if (!/^draft:\s*true\s*$/m.test(content)) continue;
    const newContent = content.replace(/^draft:\s*true\s*$/m, 'draft: false');
    if (newContent === content) continue;
    updated++;
    if (!DRY_RUN) writeFileSync(path, newContent, 'utf8');
  }
}

console.log(`DRY_RUN: ${DRY_RUN}, updated: ${updated}`);
