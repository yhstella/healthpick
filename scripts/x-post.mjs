// X (Twitter) 자동 post — daily-content-3per-day.ps1 의 글 발행 직후 호출.
//
// 환경변수 (Windows User 환경변수에 등록):
//   X_API_KEY              — API Key (consumer key)
//   X_API_KEY_SECRET       — API Key Secret (consumer secret)
//   X_ACCESS_TOKEN         — Access Token
//   X_ACCESS_TOKEN_SECRET  — Access Token Secret
//
// 사용:
//   node scripts/x-post.mjs --file "src/content/articles/health/공복혈당-122-...md"
//   node scripts/x-post.mjs --latest          (가장 최근 commit 된 글 자동)
//   node scripts/x-post.mjs --dry-run --file ...
//
// 로그: 직접 stdout. exit 0 = 성공, 1 = 실패.

import { TwitterApi } from 'twitter-api-v2';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const useLatest = args.includes('--latest');
const fileArgIdx = args.indexOf('--file');
const fileArg = fileArgIdx >= 0 ? args[fileArgIdx + 1] : null;

// 1. 대상 글 결정
function findLatestArticle() {
  // 최근 commit 의 src/content/articles/ 추가/변경 파일
  const out = execSync(
    'git log -1 --diff-filter=A --name-only --pretty=format: -- src/content/articles/',
    { cwd: ROOT, encoding: 'utf8' }
  );
  const lines = out.split(/\r?\n/).filter((l) => l && l.endsWith('.md'));
  return lines[0] || null;
}

let targetFile;
if (fileArg) {
  targetFile = fileArg;
} else if (useLatest) {
  targetFile = findLatestArticle();
  if (!targetFile) {
    console.error('No recent article commit found');
    process.exit(1);
  }
} else {
  console.error('Usage: --file <path> or --latest');
  process.exit(1);
}

const absPath = join(ROOT, targetFile);
if (!statSync(absPath).isFile()) {
  console.error(`Not a file: ${targetFile}`);
  process.exit(1);
}

// 2. frontmatter parse — title, description, category, tldr 첫 줄
const content = readFileSync(absPath, 'utf8');
const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  console.error('No frontmatter found');
  process.exit(1);
}
const fm = fmMatch[1];
function fmField(name) {
  const m = fm.match(new RegExp(`^${name}:\\s*"?(.+?)"?\\s*$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : null;
}
function fmListFirst(name) {
  // tldr·faqs 같은 list 의 첫 항목
  const m = fm.match(new RegExp(`^${name}:\\s*\\r?\\n((?:\\s+-.*\\r?\\n)+)`, 'm'));
  if (!m) return null;
  const first = m[1].split(/\r?\n/)[0].replace(/^\s+-\s*"?/, '').replace(/"?\s*$/, '');
  return first || null;
}
const title = fmField('title');
const description = fmField('description');
const category = fmField('category');
const tldr1 = fmListFirst('tldr');

// 3. URL 생성 — articleSlug 와 같은 path
const slug = basename(targetFile, '.md');
const url = `https://healthpick.kr/${category}/${encodeURIComponent(slug)}/`;

// 4. tweet 텍스트 만들기 — 280자 한도, 한국 시간대 친화 톤
//    핵심 요소: 질문 hook (title) + 핵심 답 (tldr) + URL
//    URL = 23자 (X t.co 계산)
const MAX = 280;
const URL_LEN = 23;
const SUFFIX = `\n\n→ healthpick.kr`;

let body = title;
if (tldr1) {
  body = `${title}\n\n${tldr1}`;
} else if (description) {
  body = `${title}\n\n${description}`;
}

// URL 따로 — 본문 + URL 합쳐 280자
// 본문 예산 = 280 - URL_LEN - 2 (개행)
const bodyBudget = MAX - URL_LEN - 4;
if (body.length > bodyBudget) {
  body = body.slice(0, bodyBudget - 1) + '…';
}
const tweet = `${body}\n\n${url}`;

console.log('=== Tweet preview ===');
console.log(tweet);
console.log(`--- length: ${tweet.length} chars (X 계산상 ${body.length + URL_LEN + 2} units) ---`);

if (DRY_RUN) {
  console.log('--- DRY RUN, not posted ---');
  process.exit(0);
}

// 5. X API 호출
const {
  X_API_KEY,
  X_API_KEY_SECRET,
  X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET,
} = process.env;

if (!X_API_KEY || !X_API_KEY_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
  console.error('Missing X API env vars: X_API_KEY / X_API_KEY_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET');
  process.exit(1);
}

const client = new TwitterApi({
  appKey: X_API_KEY,
  appSecret: X_API_KEY_SECRET,
  accessToken: X_ACCESS_TOKEN,
  accessSecret: X_ACCESS_TOKEN_SECRET,
});

try {
  const result = await client.v2.tweet(tweet);
  console.log(`✓ Posted: tweet_id=${result.data.id}`);
  console.log(`  url: https://x.com/dfgnejdkw/status/${result.data.id}`);
  process.exit(0);
} catch (err) {
  console.error('✗ X post failed:', err?.message || err);
  if (err?.data) console.error('  details:', JSON.stringify(err.data));
  process.exit(1);
}
