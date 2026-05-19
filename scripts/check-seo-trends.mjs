// SEO/GEO 트렌드 주간 체크 — Google Search Central·SEL·SEJ·Backlinko 등의
// RSS 피드를 가져와 우리에게 의미 있는 키워드와 매칭되는 글만 추려서
// docs/seo-trends-log.md 에 누적 기록한다.
//
// 사용:
//   node scripts/check-seo-trends.mjs           # 최근 14일 새 글 체크
//   node scripts/check-seo-trends.mjs --since 30  # 최근 30일
//   node scripts/check-seo-trends.mjs --all       # 날짜 필터 없이 전체 매칭
//
// GitHub Actions 에서 주 1회 cron 으로 실행하도록 .github/workflows/seo-trends.yml 에 연결됨.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'docs', 'seo-trends-log.md');

const args = process.argv.slice(2);
const sinceArg = args.indexOf('--since');
const WINDOW_DAYS = sinceArg !== -1 ? Number(args[sinceArg + 1]) : 14;
const ALL = args.includes('--all');

// RSS·Atom 피드. SEO/GEO 흐름을 가장 빠르게 알 수 있는 곳들.
const FEEDS = [
  { name: 'Google Search Central', url: 'https://developers.google.com/search/blog/feed.xml' },
  { name: 'Search Engine Land', url: 'https://searchengineland.com/feed' },
  { name: 'Search Engine Journal', url: 'https://www.searchenginejournal.com/feed/' },
  { name: 'Backlinko', url: 'https://backlinko.com/blog/feed' },
  { name: 'Ahrefs Blog', url: 'https://ahrefs.com/blog/feed/' },
];

// 우리(헬스픽) 운영에 직접적인 영향이 있는 키워드만 매칭.
// 대소문자 무시. 너무 폭넓게 잡으면 noise 가 많아져 정제 필요.
const KEYWORDS = [
  /\bai overview\b/i, /\bai mode\b/i, /generative search/i, /\bgeo\b/i, /\baeo\b/i,
  /helpful content/i, /scaled content/i, /spam polic/i, /\beeat\b|e-e-a-t/i,
  /core update/i, /algorithm update/i,
  /schema\.org|structured data/i,
  /(chatgpt|gemini|perplexity|claude).*\bsearch\b/i,
  /llm.*(seo|search)/i,
  /\bnaver search/i, // 네이버
  /content strateg/i,
  /featured snippet/i,
];

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripCdata(s) {
  return s
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim();
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').trim();
}

// RSS 와 Atom 둘 다 지원하는 간단한 파서. 정규식 기반이라 일부 엣지케이스는 놓칠 수 있지만 SEO 블로그 대부분 동작.
function parseFeed(xml) {
  const items = [];

  // RSS 2.0
  const rssRe = /<item\b[\s\S]*?<\/item>/gi;
  let m;
  while ((m = rssRe.exec(xml)) !== null) {
    const block = m[0];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    const date =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
      block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1];
    const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1];
    if (title && link) {
      items.push({
        title: decodeEntities(stripTags(stripCdata(title))),
        link: stripCdata(link).trim(),
        date: date ? new Date(stripCdata(date)) : null,
        desc: desc ? decodeEntities(stripTags(stripCdata(desc))).slice(0, 280) : '',
      });
    }
  }
  if (items.length) return items;

  // Atom fallback
  const atomRe = /<entry\b[\s\S]*?<\/entry>/gi;
  while ((m = atomRe.exec(xml)) !== null) {
    const block = m[0];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link = block.match(/<link[^>]*?href=["']([^"']+)["']/i)?.[1];
    const date =
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ||
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1];
    const desc =
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1];
    if (title && link) {
      items.push({
        title: decodeEntities(stripTags(stripCdata(title))),
        link: link.trim(),
        date: date ? new Date(date) : null,
        desc: desc ? decodeEntities(stripTags(stripCdata(desc))).slice(0, 280) : '',
      });
    }
  }
  return items;
}

function matchesKeywords(text) {
  return KEYWORDS.some((k) => k.test(text));
}

function isWithinWindow(date) {
  if (ALL) return true;
  if (!date || isNaN(date)) return false;
  const cutoff = Date.now() - WINDOW_DAYS * 86400000;
  return date.getTime() >= cutoff;
}

async function fetchText(targetUrl) {
  // 일부 RSS 는 헤더가 단순할 때만 통과. UA 가 봇 같으면 503 반환하는 곳도 있어서 일반 UA 사용.
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function fmtDate(d) {
  if (!d || isNaN(d)) return '?';
  return d.toISOString().slice(0, 10);
}

function appendLog(entries, summary) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const now = new Date();
  const runHeader = `\n---\n\n## ${now.toISOString().slice(0, 10)} 주간 SEO/GEO 인사이트\n\n` +
    `> 윈도우: 최근 ${WINDOW_DAYS}일 · 매칭 ${entries.length}건 · ${summary}\n\n`;

  let body = '';
  if (entries.length === 0) {
    body = '_이번 주에는 우리 키워드와 매칭되는 새 글이 없었습니다._\n';
  } else {
    // 피드별로 묶어 표시
    const byFeed = {};
    for (const e of entries) (byFeed[e.feed] ||= []).push(e);
    for (const [feed, items] of Object.entries(byFeed)) {
      body += `### ${feed}\n\n`;
      for (const it of items) {
        body += `- **${fmtDate(it.date)}** — [${it.title}](${it.link})\n`;
        if (it.desc) body += `  ${it.desc.slice(0, 200)}\n`;
      }
      body += '\n';
    }
  }

  // 처음 실행이면 파일 헤더 추가
  if (!fs.existsSync(LOG_FILE)) {
    const header =
      '# SEO/GEO 트렌드 로그\n\n' +
      '`scripts/check-seo-trends.mjs` 가 주 1회 자동으로 채워주는 로그입니다.\n' +
      'Google Search Central, Search Engine Land, Search Engine Journal, Backlinko, Ahrefs 의 RSS 에서\n' +
      'AI Overview/GEO/스팸 정책/코어 업데이트 등 우리에게 영향 있는 키워드만 추렸습니다.\n';
    fs.writeFileSync(LOG_FILE, header, 'utf8');
  }
  fs.appendFileSync(LOG_FILE, runHeader + body, 'utf8');
}

async function main() {
  console.log(`SEO trends check — window=${ALL ? 'all' : WINDOW_DAYS + 'd'}`);
  const allMatches = [];
  let okFeeds = 0;
  let failedFeeds = [];
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      const items = parseFeed(xml);
      const matches = items
        .filter((i) => isWithinWindow(i.date))
        .filter((i) => matchesKeywords(`${i.title} ${i.desc}`));
      for (const m of matches) allMatches.push({ ...m, feed: feed.name });
      okFeeds += 1;
      console.log(`  [${feed.name}] ${items.length} items, ${matches.length} matched`);
    } catch (e) {
      console.warn(`  ! ${feed.name}: ${e.message}`);
      failedFeeds.push(feed.name);
    }
  }

  // 같은 글이 여러 피드에서 잡힐 수 있으니 link 기준 중복 제거.
  const dedup = Array.from(new Map(allMatches.map((m) => [m.link, m])).values());
  dedup.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const summary = `feeds OK=${okFeeds}/${FEEDS.length}${failedFeeds.length ? ', failed=' + failedFeeds.join(',') : ''}`;
  appendLog(dedup, summary);

  console.log(`\n✅ ${dedup.length} unique matches logged to ${path.relative(ROOT, LOG_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
