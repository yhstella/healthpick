import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 도메인: healthpick.kr. 빌드 시 SITE_URL 환경변수로 덮어쓸 수 있음 (스테이징 등).
const SITE = process.env.SITE_URL || 'https://healthpick.kr';

export default defineConfig({
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
});
