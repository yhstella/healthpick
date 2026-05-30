// 긴박감/심리조작 톤 일괄 치환 — AdSense Webmaster Quality Guidelines 위반 회피.
// "막차/서둘러야/마지막 기회/지금 안 하면" 같은 심리 조작 표현이 신뢰도 ↓.
// 페르소나 검토(2026-05-30)에서 finance 글의 "5월 말이 마지막 기회" 톤이 지적됨.
//
// "긴급" 은 의료 응급(119)·정책 마감일 등 정상 사용 케이스가 있으므로 신중 치환:
//   - "긴급히 신청" → "빠르게 신청" (심리 조작 의도)
//   - "긴급 의료 상황" 은 그대로 (안전 안내)
//
// 사용:
//   node scripts/sanitize-urgency.mjs --dry-run
//   node scripts/sanitize-urgency.mjs

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');
const LOG_DIR = join(ROOT, 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

const DRY_RUN = process.argv.includes('--dry-run');

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitFrontmatter(content) {
  const m = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) return { frontmatter: '', body: content };
  return { frontmatter: m[1], body: m[2] };
}

// 패턴별 랜덤 풀 — 자연스럽고 중립적인 표현으로
const PATTERNS = [
  // 명백한 심리 조작 — 100% 치환
  { from: '지금 안 하면', pool: ['이 시점을 놓치면', '현재 기준 시점 이후에는', '시점이 지나면', '시점을 넘기면'], rate: 1.0 },
  { from: '막차를 놓치', pool: ['이 시점을 놓치', '시점을 넘기'], rate: 1.0 },
  { from: '막차', pool: ['현재 시점', '현 기준', '5월 시점'], rate: 0.9 },
  { from: '서둘러서', pool: ['미리', '여유 있게', '계획적으로'], rate: 1.0 },
  { from: '서두르', pool: ['미리 준비하', '여유 있게 진행하', '계획적으로 진행하'], rate: 0.85 },
  { from: '마지막 기회', pool: ['현재 적용 시점', '이번 시점의 기회', '현재 시점의 적용 구간'], rate: 1.0 },
  { from: '놓치면 큰 손해', pool: ['놓치면 적용 못 받음', '시점을 넘기면 다음 기회를 기다려야 함', '시점을 놓치면 다른 방법을 찾아야 함'], rate: 1.0 },
  { from: '놓치면', pool: ['시점을 넘기면', '시기를 놓치면', '적용 시점이 지나면'], rate: 0.7 },
  { from: '기회를 놓치', pool: ['적용 시점을 놓치', '시기를 놓치'], rate: 1.0 },
  { from: '급하게', pool: ['빠르게', '조속히', '단기간에'], rate: 0.85 },
  // "긴급" — 의료 응급 컨텍스트 보존 위해 신중. "긴급히" / "긴급 신청" / "긴급 적용" 만 치환
  { from: '긴급히 ', pool: ['빠르게 ', '조속히 ', '바로 '], rate: 0.9 },
  { from: '긴급 적용', pool: ['빠른 적용', '즉시 적용'], rate: 1.0 },
  { from: '긴급 신청', pool: ['빠른 신청', '조속한 신청'], rate: 1.0 },
  // "긴급" 단독 (의료 응급일 가능성) 은 건드리지 않음
];

const categories = readdirSync(ARTICLES).filter((d) => {
  try { return statSync(join(ARTICLES, d)).isDirectory(); } catch { return false; }
});

let totalFiles = 0;
let touchedFiles = 0;
let totalReplacements = 0;
const perPattern = {};

for (const cat of categories) {
  const catDir = join(ARTICLES, cat);
  const files = readdirSync(catDir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    totalFiles++;
    const path = join(catDir, f);
    const content = readFileSync(path, 'utf8');
    const { frontmatter, body } = splitFrontmatter(content);
    let newBody = body;
    let fileHits = 0;
    for (const { from, pool, rate } of PATTERNS) {
      const re = new RegExp(escapeRegex(from), 'g');
      let hits = 0;
      newBody = newBody.replace(re, () => {
        if (Math.random() < rate) {
          hits++;
          return pickRandom(pool);
        }
        return from;
      });
      if (hits > 0) {
        perPattern[from] = (perPattern[from] || 0) + hits;
        fileHits += hits;
      }
    }
    if (fileHits === 0) continue;
    touchedFiles++;
    totalReplacements += fileHits;
    if (!DRY_RUN) {
      writeFileSync(path, frontmatter + newBody, 'utf8');
    }
  }
}

console.log('\n=========================================');
console.log(`DRY_RUN          : ${DRY_RUN}`);
console.log(`scanned files    : ${totalFiles}`);
console.log(`touched files    : ${touchedFiles}`);
console.log(`total replaces   : ${totalReplacements}`);
console.log('=========================================');
console.log('패턴별 치환 수:');
for (const [pat, cnt] of Object.entries(perPattern).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pat.padEnd(20)} ${cnt} 건`);
}
