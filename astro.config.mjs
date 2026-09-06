import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/static';
import remarkGfm from 'remark-gfm';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 도메인: healthpick.kr. 빌드 시 SITE_URL 환경변수로 덮어쓸 수 있음 (스테이징 등).
const SITE = process.env.SITE_URL || 'https://healthpick.kr';

// ============================================================================
// sitemap lastmod 맵 — 글마다 진짜 변경 시점(frontmatter pubDate/updatedDate)을
// <lastmod> 로 박기 위한 URL→date 맵. 빌드 시작 시 1회 구성.
// ============================================================================
// 배경 — @astrojs/sitemap 3.1.6 의 default 는 frontmatter pubDate 를 lastmod 로
// 자동 적용하지 않는다 (dousuru 가 "default 가 자동 적용" 이라 했으나 실측 결과 미적용,
// production sitemap lastmod 0건). 따라서 serialize 에서 직접 lookup 해 박는다.
// 🚨 절대 모든 URL 에 동일한 빌드 시점 날짜를 박지 말 것 — scaled content abuse 사고 원인.
//    반드시 글마다 다른 frontmatter 날짜를 박아야 정상 신호.
// 공개면에서 내린 카테고리 (site.ts PUBLIC_CATEGORIES 의 여집합).
// astro.config 는 TS 를 import 하지 않으므로 값을 복제한다 — 한쪽만 고치지 말 것.
const NON_PUBLIC_CATEGORIES = ['living', 'finance', 'tech', 'auto', 'travel', 'study'];
const CATEGORIES_FOR_MAP = ['health', 'living', 'finance', 'tech', 'auto', 'travel', 'study'];
// fileURLToPath 로 OS 안전하게 변환 (Windows 의 C:/ 경로 포함).
const ARTICLES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'src', 'content', 'articles');

/** frontmatter 에서 pubDate / updatedDate 한 줄만 가볍게 추출 (yaml 파서 없이). */
function extractDate(mdPath) {
  let pub = null, upd = null;
  try {
    const txt = readFileSync(mdPath, 'utf-8');
    const end = txt.indexOf('\n---', 3);
    const fm = end > 0 ? txt.slice(0, end) : txt.slice(0, 2000);
    const mp = fm.match(/^pubDate:\s*["']?([0-9T:.\-+Zz ]+)["']?\s*$/m);
    const mu = fm.match(/^updatedDate:\s*["']?([0-9T:.\-+Zz ]+)["']?\s*$/m);
    if (mp) pub = mp[1].trim();
    if (mu) upd = mu[1].trim();
  } catch {}
  // updatedDate 우선 (진짜 마지막 변경), 없으면 pubDate
  const raw = upd || pub;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** URL path(/{category}/{slug}/) → ISO date 맵 구성. */
function buildLastmodMap() {
  const map = new Map();
  for (const cat of CATEGORIES_FOR_MAP) {
    const dir = join(ARTICLES_DIR, cat);
    let files;
    try { files = readdirSync(dir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      const iso = extractDate(join(dir, f));
      if (!iso) continue;
      const slug = f.replace(/\.md$/, '');
      // 라우트는 /{category}/{slug}/ (trailing slash). 한글 slug 는 encodeURI 형태로도 매칭.
      const plain = `/${cat}/${slug}/`;
      map.set(plain, iso);
      map.set(encodeURI(plain), iso);
    }
  }
  return map;
}
const LASTMOD_MAP = buildLastmodMap();

// 빌드 출력 위치 — 기본은 ./dist (Vercel CI가 기대하는 경로).
// 로컬에서 Dropbox 폴더 충돌을 피하려면 OUT_DIR 환경변수로 외부 폴더 지정.
//   예: OUT_DIR=C:/Users/R/healthpick-dist npm run build
const OUT_DIR = process.env.OUT_DIR || 'dist';

// 🚨 완전 정적(static). SSR 라우트는 하나도 없다.
//
// 이전에는 output: 'hybrid' + @astrojs/vercel/serverless 였다. OG 이미지가 SSR 이던
// 시절의 잔재인데, OG 를 prerender=true 로 돌린 뒤로 SSR 라우트는 0 이 됐다.
// 그런데도 hybrid 설정이 남아 쓰지도 않는 `_render` 함수가 계속 생성되고 있었다.
//
// 2026-08-15 사고: Node 20 EOL 대응으로 engines 를 24 로 올렸더니
//   - Vercel 이 Node 24 로 빌드
//   - @astrojs/vercel@7.8.2 의 SUPPORTED_NODE_VERSIONS 는 {18,20} 뿐 → nodejs18.x 로 폴백
//   - Vercel 이 nodejs18.x 를 이미 제거 → 배포 거부
//   → "Serverless Functions contain an invalid runtime: _render (nodejs18.x)"
// dousuru 에서 먼저 같은 장애가 났고 동일하게 수정했다.
//
// static 으로 바꾸면 함수 자체가 사라져 런타임 버전 문제가 영구히 없어진다.
// 동적 라우트(og/[slug].png, raw/[category]/[...slug].md)는 모두 getStaticPaths 가 있어
// 정적 생성이 가능하다.
//
// ⚠️ SSR 이 다시 필요해지면 hybrid 로 되돌리기 전에 어댑터를 Node 22+ 를 아는
//    버전으로 먼저 올릴 것. 안 그러면 같은 사고가 난다.
const baseConfig = {
  site: SITE,
  output: 'static',
  adapter: vercel({
    imageService: false,
    webAnalytics: { enabled: false },
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // ========================================================================
      // 🚨 절대 `lastmod: new Date()` 사용 금지 (2026-06-12 사고 + dousuru 검증).
      // ========================================================================
      // 이유 — 매 빌드(현재 8시간 주기)마다 모든 3,700편 URL 의 lastmod 가 "방금" 으로 갱신.
      // 1편만 새 글 추가됐는데 전체 사이트가 "오늘 다 업데이트됨" 으로 보여 Google 의
      // scaled content abuse 정책 트리거 → GSC impression 0 사고(2026-06-12) 직접 원인.
      //
      // ✅ 글마다 다른 lastmod (frontmatter pubDate/updatedDate) → serialize 에서 LASTMOD_MAP lookup
      // ✅ 글 변경 시 그 글의 frontmatter pubDate (또는 updatedDate) 만 변경
      // ❌ 매 빌드 시점으로 모든 URL lastmod 강제 갱신
      // ❌ sitemap 전체를 일괄 manipulation 보이게 하는 행위
      // (lastmod 옵션 자체는 set 하지 않음 — 그러면 빌드 시점이 일괄로 박힘)
      //
      // SERP 가치 없거나 noindex 인 페이지는 sitemap 에서 제외 — Google 이 sitemap 안 페이지에
      // noindex 만나면 "왜 sitemap 에 올렸냐" 신호로 quality 평가 ↓. 검색·tip·thin paginated 제외.
      filter: (page) =>
        !page.includes('/search') &&
        !page.includes('/tip') &&
        // /raw/{cat}/{slug}.md — LLM fetch 용 markdown endpoint, 정규 HTML 이 canonical
        !page.includes('/raw/') &&
        // /archive/2/ /archive/3/ ... 같은 paginated 페이지 제외 (1페이지만 유지)
        !/\/archive\/\d+\/?$/.test(page) &&
        // /category/{cat}/2/ /category/{cat}/3/ ... 도 제외
        !/\/category\/[^/]+\/\d+\/?$/.test(page) &&
        // /tag/* — 글 5개 미만 thin tag 는 페이지에서 noindex 처리됨. 그런 페이지가 sitemap 에
        // 들어가있으면 GSC 가 "Excluded by noindex tag" 경고 → quality 평가 ↓.
        // (2026-06-12 GSC 추가 알림) tag 페이지 전체를 sitemap 에서 제외. tag 페이지는
        // hub 역할이지 SEO 메인 target 이 아니라 손실 미세. popular tag(글>=5) 도 함께 제외해
        // sitemap 의 noindex conflict 0 보장.
        !page.includes('/tag/') &&
        // 🚨 비공개 카테고리(= PUBLIC_CATEGORIES 밖) 글·hub 는 sitemap 에서 제외.
        //    AdSense "Low value content" 3회 반려 대응으로 의료 군집만 공개면에 남겼다.
        //    이 페이지들은 noindex 라 sitemap 에 두면 "noindex conflict" 경고가 뜬다.
        //    ⚠️ site.ts 의 PUBLIC_CATEGORIES 가 SSOT — 거기 바꾸면 여기 목록도 같이 고칠 것.
        !NON_PUBLIC_CATEGORIES.some(
          (c) => page.includes(`/${c}/`) || page.includes(`/category/${c}`)
        ),
      // 글 페이지(/{category}/{slug}/)마다 (1) 글별 OG PNG image:loc + (2) 글별 lastmod.
      // @astrojs/sitemap 은 item 에 img 필드가 있으면 자동으로 sitemap-image namespace 추가.
      serialize(item) {
        // (2) lastmod — LASTMOD_MAP 에서 이 URL 의 frontmatter 날짜 lookup.
        // item.url 은 절대 URL(https://healthpick.kr/...) 이라 pathname 만 뽑아 매칭.
        let pathOnly = item.url;
        try { pathOnly = new URL(item.url).pathname; } catch {}
        const iso = LASTMOD_MAP.get(pathOnly) || LASTMOD_MAP.get(decodeURI(pathOnly));
        if (iso) {
          item.lastmod = iso;
        } else {
          // 글이 아닌 페이지(홈·about·category 1p 등)는 lastmod 없이 — 빌드 시점 박지 않음.
          delete item.lastmod;
        }
        // (1) OG image
        const m = item.url.match(/\/(health|living|finance|tech|auto|travel|study)\/([^/]+)\/?$/);
        if (m) {
          const slug = m[2];
          // 슬러그에 한글이 들어가도 image:loc 안에서는 URL-encoded 형태가 안전.
          const ogUrl = `${SITE}/og/${encodeURIComponent(slug)}.png`;
          item.img = [{ url: ogUrl }];
        }
        return item;
      },
    }),
  ],
  // 한국어 본문에 흔한 "60~80 IU/L", "6개월~1년" 같은 범위 표기가 GFM strikethrough 의
  // single tilde 처리로 잘못 strikethrough 되는 문제 fix.
  // micromark-extension-gfm-strikethrough 의 singleTilde default 가 true 라서, 한 문단에
  // ~ 짝수개 있으면 두 번째·네 번째 ~ 사이가 <del> 로 처리됨 (예: "60~80 IU/L가 ... 6개월")
  // → gfm: false + remark-gfm 명시 등록(singleTilde: false). table·tasklist·autolink 등
  // 다른 GFM 기능은 그대로 동작.
  markdown: {
    gfm: false,
    remarkPlugins: [
      [remarkGfm, { singleTilde: false }],
    ],
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
};

export default defineConfig({
  ...baseConfig,
  ...(OUT_DIR !== 'dist' ? { outDir: OUT_DIR } : {}),
});
