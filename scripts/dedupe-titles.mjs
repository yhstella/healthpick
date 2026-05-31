// 중복 title 글 정리 — 같은 title 의 글이 여러 개면 더 새 글만 남기고 옛 글 삭제 + 301 redirect.
// 2026-05-31 점검에서 9쌍(18편) 발견. AdSense duplicate content 평가 위험.
//
// 사용:
//   node scripts/dedupe-titles.mjs --dry-run    (분석만)
//   node scripts/dedupe-titles.mjs              (실제 삭제 + vercel.json redirect 추가)

import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');
const DRY_RUN = process.argv.includes('--dry-run');

const titleFiles = new Map();
const cats = readdirSync(ARTICLES).filter((d) => {
  try { return statSync(join(ARTICLES, d)).isDirectory(); } catch { return false; }
});

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  const titleMatch = m[1].match(/^title:\s*"?(.+?)"?\s*$/m);
  if (titleMatch) fm.title = titleMatch[1].trim().replace(/^"|"$/g, '');
  const pubMatch = m[1].match(/^pubDate:\s*(.+)$/m);
  if (pubMatch) fm.pubDate = pubMatch[1].trim();
  return fm;
}

for (const cat of cats) {
  const cdir = join(ARTICLES, cat);
  for (const f of readdirSync(cdir).filter((x) => x.endsWith('.md'))) {
    const path = join(cdir, f);
    const content = readFileSync(path, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm.title) continue;
    const key = fm.title;
    if (!titleFiles.has(key)) titleFiles.set(key, []);
    titleFiles.get(key).push({ path, cat, file: f, pubDate: fm.pubDate || '0000-01-01' });
  }
}

const dups = [...titleFiles.entries()].filter(([, arr]) => arr.length > 1);
console.log(`\n=== 중복 title: ${dups.length} groups ===\n`);

const toDelete = [];
const redirects = [];

for (const [title, files] of dups) {
  // pubDate desc 정렬, 첫 번째(가장 새 글)는 keep, 나머지는 삭제
  files.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  const keep = files[0];
  const dropList = files.slice(1);
  console.log(`[${title}]`);
  console.log(`  KEEP: ${keep.cat}/${keep.file} (${keep.pubDate})`);
  for (const d of dropList) {
    console.log(`  DROP: ${d.cat}/${d.file} (${d.pubDate})`);
    toDelete.push(d.path);
    // URL: /{cat}/{slug-without-.md}/
    const dropSlug = d.file.replace(/\.md$/, '');
    const keepSlug = keep.file.replace(/\.md$/, '');
    redirects.push({
      source: `/${d.cat}/${dropSlug}/`,
      destination: `/${keep.cat}/${keepSlug}/`,
      permanent: true,
    });
  }
  console.log('');
}

console.log(`=== summary ===`);
console.log(`dup groups: ${dups.length}`);
console.log(`to delete : ${toDelete.length}`);
console.log(`redirects : ${redirects.length}`);

if (!DRY_RUN && toDelete.length > 0) {
  // 1) 파일 삭제
  for (const p of toDelete) unlinkSync(p);
  console.log(`✓ deleted ${toDelete.length} files`);

  // 2) vercel.json redirects append (기존 보존)
  const vercelPath = join(ROOT, 'vercel.json');
  let cfg = {};
  if (existsSync(vercelPath)) {
    try { cfg = JSON.parse(readFileSync(vercelPath, 'utf8')); } catch {}
  }
  const existing = Array.isArray(cfg.redirects) ? cfg.redirects : [];
  const newSources = new Set(redirects.map((r) => r.source));
  const preserved = existing.filter((r) => !r.source || !newSources.has(r.source));
  cfg.redirects = [...preserved, ...redirects];
  writeFileSync(vercelPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  console.log(`✓ vercel.json redirects updated (+${redirects.length})`);
}
