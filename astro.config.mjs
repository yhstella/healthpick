import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import remarkGfm from 'remark-gfm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildArticleLastmodMap, sitemapArticleImage } from './scripts/lib/sitemap-metadata.mjs';
import { rawStaticHeaders } from './scripts/lib/raw-static-headers.mjs';
import { sitemapDatePrecision } from './scripts/lib/sitemap-date-precision.mjs';

// 도메인: healthpick.kr. 빌드 시 SITE_URL 환경변수로 덮어쓸 수 있음 (스테이징 등).
const SITE = process.env.SITE_URL || 'https://healthpick.kr';

// ============================================================================
// sitemap lastmod 맵 — 글마다 진짜 변경 시점(frontmatter pubDate/updatedDate)을
// <lastmod> 로 박기 위한 URL→date 맵. 빌드 시작 시 1회 구성.
// ============================================================================
// 배경 — @astrojs/sitemap 3.1.6 의 default 는 frontmatter pubDate 를 lastmod 로
// 자동 적용하지 않는다 (dousuru 가 "default 가 자동 적용" 이라 했으나 실측 결과 미적용,
// production sitemap lastmod 0건). 따라서 serialize 에서 직접 lookup 해 박는다.
// 빌드 시각을 실제 내용 변경일로 표시하지 않는다.
// 공개면에서 내린 카테고리 (site.ts PUBLIC_CATEGORIES 의 여집합).
// astro.config 는 TS 를 import 하지 않으므로 값을 복제한다 — 한쪽만 고치지 말 것.
const NON_PUBLIC_CATEGORIES = ['living', 'finance', 'tech', 'auto', 'travel', 'study'];
const CATEGORIES_FOR_MAP = ['health', 'living', 'finance', 'tech', 'auto', 'travel', 'study'];
// fileURLToPath 로 OS 안전하게 변환 (Windows 의 C:/ 경로 포함).
const ARTICLES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'src', 'content', 'articles');

// Astro와 같은 슬러그 정규화를 사용한다. 소수점·대문자가 있는 파일명도 일치시킨다.
const LASTMOD_MAP = buildArticleLastmodMap(ARTICLES_DIR, CATEGORIES_FOR_MAP);

// 빌드 출력 위치 — 기본은 ./dist (Vercel CI가 기대하는 경로).
// 로컬에서 Dropbox 폴더 충돌을 피하려면 OUT_DIR 환경변수로 외부 폴더 지정.
//   예: OUT_DIR=C:/Users/R/healthpick-dist npm run build
const OUT_DIR = process.env.OUT_DIR || 'dist';

// OG와 raw도 빌드 때 생성한다. 서버 함수와 동적 이미지 서비스는 사용하지 않는다.
const baseConfig = {
  site: SITE,
  output: 'static',
  compressHTML: true,
  adapter: vercel({
    imageService: false,
    staticHeaders: true,
  }),
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // lastmod는 글별 실제 발행일/수정일만 사용한다. 빌드 시각을 일괄 기록하지 않는다.
      // 과거 날짜 설정이 유입 부진의 직접 원인이라는 인과관계는 확인되지 않았다.
      // 검색·제보·페이지네이션과 noindex 페이지는 검색용 사이트맵에서 제외한다.
      filter: (page) =>
        !page.includes('/search') &&
        !page.includes('/tip') &&
        // /raw/{cat}/{slug}.md — LLM fetch 용 markdown endpoint, 정규 HTML 이 canonical
        !page.includes('/raw/') &&
        // /archive/2/ /archive/3/ ... 같은 paginated 페이지 제외 (1페이지만 유지)
        !/\/archive\/\d+\/?$/.test(page) &&
        // /category/{cat}/2/ /category/{cat}/3/ ... 도 제외
        !/\/category\/[^/]+\/\d+\/?$/.test(page) &&
        // 태그는 탐색용 허브로 유지하되 검색용 사이트맵에서는 모두 제외한다.
        !page.includes('/tag/') &&
        // 🚨 비공개 카테고리(= PUBLIC_CATEGORIES 밖) 글·hub 는 sitemap 에서 제외.
        //    AdSense "Low value content" 3회 반려 대응으로 의료 군집만 공개면에 남겼다.
        //    noindex인 페이지와 검색용 사이트맵의 대상을 일치시킨다.
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
        const ogUrl = sitemapArticleImage(item.url, SITE);
        if (ogUrl) item.img = [{ url: ogUrl }];
        return item;
      },
    }),
    sitemapDatePrecision(LASTMOD_MAP),
    rawStaticHeaders(),
  ],
  // 한국어 본문에 흔한 "60~80 IU/L", "6개월~1년" 같은 범위 표기가 GFM strikethrough 의
  // single tilde 처리로 잘못 strikethrough 되는 문제 fix.
  // micromark-extension-gfm-strikethrough 의 singleTilde default 가 true 라서, 한 문단에
  // ~ 짝수개 있으면 두 번째·네 번째 ~ 사이가 <del> 로 처리됨 (예: "60~80 IU/L가 ... 6개월")
  // → gfm: false + remark-gfm 명시 등록(singleTilde: false). table·tasklist·autolink 등
  // 다른 GFM 기능은 그대로 동작.
  markdown: {
    processor: unified({
      gfm: false,
      remarkPlugins: [[remarkGfm, { singleTilde: false }]],
    }),
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
