import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';

// 도메인: healthpick.kr. 빌드 시 SITE_URL 환경변수로 덮어쓸 수 있음 (스테이징 등).
const SITE = process.env.SITE_URL || 'https://healthpick.kr';

// 빌드 출력 위치 — 기본은 ./dist (Vercel CI가 기대하는 경로).
// 로컬에서 Dropbox 폴더 충돌을 피하려면 OUT_DIR 환경변수로 외부 폴더 지정.
//   예: OUT_DIR=C:/Users/R/healthpick-dist npm run build
const OUT_DIR = process.env.OUT_DIR || 'dist';

// hybrid: 모든 페이지 기본 static, 개별 페이지가 `export const prerender = false` 로 SSR 전환.
// OG 이미지 엔드포인트(/og/[slug].png) 한 곳만 SSR — 빌드 타임에 3,630장 안 만들고 요청 시점 생성.
const baseConfig = {
  site: SITE,
  output: 'hybrid',
  adapter: vercel({
    // 정적 빌드된 페이지는 그대로 CDN 캐싱. OG 함수만 따로 생성.
    imageService: false,
    webAnalytics: { enabled: false },
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // 글 페이지(/{category}/{slug}/)마다 글별 OG PNG 를 image:loc 으로 등록.
      // @astrojs/sitemap 은 item 에 img 필드가 있으면 자동으로 sitemap-image namespace 추가.
      // → Google 이미지 검색이 같은 페이지의 핵심 이미지를 인덱싱할 때 우선 시그널.
      serialize(item) {
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
