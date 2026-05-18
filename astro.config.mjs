import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 도메인: healthpick.kr. 빌드 시 SITE_URL 환경변수로 덮어쓸 수 있음 (스테이징 등).
const SITE = process.env.SITE_URL || 'https://healthpick.kr';

// 빌드 출력 위치 — 기본은 ./dist (Vercel CI가 기대하는 경로).
// 로컬에서 Dropbox 폴더 충돌을 피하려면 OUT_DIR 환경변수로 외부 폴더 지정.
//   예: OUT_DIR=C:/Users/R/healthpick-dist npm run build
const OUT_DIR = process.env.OUT_DIR || 'dist';

const baseConfig = {
  site: SITE,
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
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
