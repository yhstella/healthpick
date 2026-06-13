// 한글 slug 마이그레이션 — 로마자 표기 slug 를 제목 기반 한글 slug 로 변환.
//
// 실행:
//   node scripts/migrate-slugs.mjs --dry-run --limit 10   (10편 미리보기)
//   node scripts/migrate-slugs.mjs                        (전체 적용)
//
// 산출물:
//   - 파일명 변경 (src/content/articles/{cat}/{old}.md → {cat}/{new}.md)
//   - logs/slug-migration-{stamp}.json (old → new 매핑)
//   - vercel.json 의 redirects 자동 갱신

import { readdirSync, readFileSync, renameSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');
const LOG_DIR = join(ROOT, 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx >= 0 ? Number(process.argv[idx + 1]) : Infinity;
})();

// =====================================================================
// 제목 → 한글 slug 알고리즘
//
// 1. em-dash / "—" / " — " 앞 부분만 사용 (subtitle 잘라냄)
// 2. 콜론 ":" 다음에 핵심 키워드가 오면 그 부분 사용
// 3. 특수문자 제거 (`?` `!` `,` 등)
// 4. 한글·영문·숫자만 남기고 나머지는 하이픈
// 5. 연속 하이픈 정리, 앞뒤 하이픈 제거
// 6. 소문자
// 7. 30자 cap (의미 잘리지 않게 마지막 하이픈에서 자름)
// =====================================================================

const PARTICLES = ['은', '는', '이', '가', '을', '를', '의', '와', '과', '에', '에서', '으로', '로'];

function makeSlug(title) {
  // 1. em-dash 앞 부분만
  let s = title.split(/[—–]/)[0].trim();
  // 콜론 처리 — "X: Y" 면 둘 다 합쳐서
  s = s.replace(/:/g, ' ');

  // 2. 특수문자 → 공백 (하이픈 보존)
  s = s.replace(/[,.\?!""''「」『』·…\(\)\[\]\{\}\/\\|*<>"']/g, ' ');

  // 3. 한글·영문·숫자·공백·하이픈만 (나머지는 공백)
  s = s.replace(/[^\p{L}\p{N}\s\-]/gu, ' ');

  // 4. 공백 → 하이픈, 연속 하이픈 정리
  s = s.trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // 5. 소문자 (영문 부분)
  s = s.toLowerCase();

  // 6. 너무 길면 마지막 하이픈에서 자름 (40자 cap)
  if (s.length > 40) {
    const cut = s.lastIndexOf('-', 40);
    if (cut > 20) s = s.slice(0, cut);
    else s = s.slice(0, 40).replace(/-+$/, '');
  }

  return s;
}

function parseTitle(content) {
  // frontmatter 안 title 만 빠르게 추출 — YAML 파서 안 씀
  const m = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return m ? m[1].trim() : null;
}

// =====================================================================
// 마이그레이션 실행
// =====================================================================

const categories = readdirSync(ARTICLES).filter((d) => {
  try { return readdirSync(join(ARTICLES, d)).length > 0; } catch { return false; }
});

let total = 0;
let migrated = 0;
let skipped = 0;
let conflicts = 0;
const mapping = []; // { category, oldSlug, newSlug, title }
const newSlugTaken = new Map(); // category → Set(slug)

// 1단계: 기존 한글 slug 인 파일은 그대로 (이미 마이그된 것)
//        로마자 slug 만 변환 대상
for (const cat of categories) {
  const catDir = join(ARTICLES, cat);
  const files = readdirSync(catDir).filter((f) => f.endsWith('.md'));
  const taken = new Set();
  for (const f of files) {
    const baseSlug = basename(f, '.md');
    if (/[ㄱ-힝]/u.test(baseSlug)) {
      // 이미 한글 포함 — 마이그 안 함, 이름 그대로 taken 에 등록
      taken.add(baseSlug);
    }
  }
  newSlugTaken.set(cat, taken);
}

// 2단계: 로마자 파일 순회하며 변환
for (const cat of categories) {
  const catDir = join(ARTICLES, cat);
  const files = readdirSync(catDir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    if (total >= LIMIT) break;

    const oldSlug = basename(f, '.md');
    // 이미 한글이 들어간 slug 는 skip
    if (/[ㄱ-힝]/u.test(oldSlug)) {
      skipped++;
      continue;
    }

    total++;
    const fullPath = join(catDir, f);
    const content = readFileSync(fullPath, 'utf8');
    const title = parseTitle(content);

    if (!title) {
      console.warn(`[!] ${cat}/${oldSlug} : title 못 찾음 — skip`);
      skipped++;
      continue;
    }

    let newSlug = makeSlug(title);
    if (!newSlug) {
      console.warn(`[!] ${cat}/${oldSlug} : slug 생성 실패 (제목: ${title}) — skip`);
      skipped++;
      continue;
    }

    // 충돌 해소
    const taken = newSlugTaken.get(cat);
    let final = newSlug;
    let n = 2;
    while (taken.has(final)) {
      final = `${newSlug}-${n}`;
      n++;
      if (n > 50) { conflicts++; break; }
    }
    taken.add(final);

    mapping.push({ category: cat, oldSlug, newSlug: final, title });

    if (!DRY_RUN) {
      const newPath = join(catDir, `${final}.md`);
      try {
        renameSync(fullPath, newPath);
      } catch (e) {
        console.error(`[X] ${cat}/${oldSlug} → ${final} 실패:`, e.message);
        continue;
      }
    }
    migrated++;
  }
}

// =====================================================================
// 매핑 + redirects 출력
// =====================================================================

const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const mapFile = join(LOG_DIR, `slug-migration-${stamp}.json`);
writeFileSync(mapFile, JSON.stringify(mapping, null, 2), 'utf8');

// vercel.json 의 redirects 생성 — 옛 URL 들로 들어온 요청을 새 URL 로 301.
// 🚨 self-loop 방지 (2026-06-14 fix): oldSlug === newSlug 인 매핑은 redirect 생성 안 함.
// 이미 한글 slug 라 변환 불필요한 글까지 source===destination redirect 를 만들면 무한
// redirect loop → Vercel 배포 실패 + 해당 글 색인 불가. (사고: b671beb4, 자동 작업이
// /health/alt-110-ast-32/ → 자기자신 loop 생성해 production deploy 실패)
const redirects = mapping
  .filter(({ oldSlug, newSlug }) => oldSlug !== newSlug)
  .map(({ category, oldSlug, newSlug }) => ({
    source: `/${category}/${oldSlug}/`,
    destination: `/${category}/${newSlug}/`,
    permanent: true,
  }));

const vercelJsonPath = join(ROOT, 'vercel.json');
let vercelCfg = {};
if (existsSync(vercelJsonPath)) {
  try { vercelCfg = JSON.parse(readFileSync(vercelJsonPath, 'utf8')); } catch {}
}
// 기존 redirects 보존 (www→non-www 리다이렉트 등) + 이번 라운드 mapping 만 append.
// 이전 버전(2026-05-27 이전)은 redirects 를 통째로 덮어써 www 리다이렉트가 날아가는
// 버그가 있었음 — 안전망 자동 호출 시 매번 다른 redirect 가 사라짐. 보존 로직 필수.
const existingRedirects = Array.isArray(vercelCfg.redirects) ? vercelCfg.redirects : [];
const newSources = new Set(redirects.map((r) => r.source));
// 보존 시에도 self-loop(source===destination)는 항상 제거 — 과거에 잘못 생성된 것 청소.
const preserved = existingRedirects.filter(
  (r) => (!r.source || !newSources.has(r.source)) && r.source !== r.destination
);
vercelCfg.redirects = [...preserved, ...redirects];

if (!DRY_RUN) {
  writeFileSync(vercelJsonPath, JSON.stringify(vercelCfg, null, 2) + '\n', 'utf8');
}

console.log('\n=========================================');
console.log(`DRY_RUN          : ${DRY_RUN}`);
console.log(`total candidates : ${total}`);
console.log(`migrated         : ${migrated}`);
console.log(`skipped          : ${skipped}`);
console.log(`conflicts (>50)  : ${conflicts}`);
console.log(`mapping file     : ${relative(ROOT, mapFile)}`);
console.log(`vercel.json      : ${DRY_RUN ? '(dry run, 미작성)' : 'updated'}`);
console.log('=========================================\n');

// 샘플 5개 출력
console.log('샘플 변환 5개:');
mapping.slice(0, 5).forEach((m) => {
  console.log(`  ${m.category}/${m.oldSlug}  →  ${m.category}/${m.newSlug}`);
  console.log(`     title: ${m.title}`);
});
