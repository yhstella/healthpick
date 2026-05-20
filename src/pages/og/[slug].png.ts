// 글별 OG/SEO 이미지 — 요청 시점에 SSR 로 PNG 생성.
//
// 빌드 타임에 3,630장을 만들면 Vercel 빌드 한도(45분) 초과 → 의도적으로 SSR.
// Cache-Control: 1년 immutable → 첫 요청 후 Vercel Edge / CDN 에서 캐싱, 비용 미미.
//
// 디자인은 src/components/HeroCard.astro 와 동기화 유지. 같은 슬러그가 양쪽에서 같은 변형으로 보여야 한다.
// 변형 추가 시 두 곳 다 수정 — 메모리 노트(project_healthpick_og_image_system.md) 참조.

import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, type CategorySlug } from '@lib/site';
import { articleSlug } from '@lib/article';
import { pickHeroVariant, type HeroVariant } from '@lib/hero-variant';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

type Palette = { bgA: string; bgB: string; accentBg: string; accentText: string };
const PALETTES: Record<CategorySlug, Palette> = {
  health:  { bgA: '#FFE4E6', bgB: '#FBCFE8', accentBg: '#fb7185', accentText: '#fff' },
  living:  { bgA: '#FEF3C7', bgB: '#FED7AA', accentBg: '#f59e0b', accentText: '#fff' },
  finance: { bgA: '#D1FAE5', bgB: '#A7F3D0', accentBg: '#10b981', accentText: '#fff' },
  tech:    { bgA: '#DBEAFE', bgB: '#BFDBFE', accentBg: '#3b82f6', accentText: '#fff' },
  auto:    { bgA: '#E2E8F0', bgB: '#CBD5E1', accentBg: '#475569', accentText: '#fff' },
  travel:  { bgA: '#E0E7FF', bgB: '#C7D2FE', accentBg: '#6366f1', accentText: '#fff' },
  study:   { bgA: '#EDE9FE', bgB: '#DDD6FE', accentBg: '#8b5cf6', accentText: '#fff' },
};

// 폰트 로딩 — 함수 인스턴스 안에서 1회 캐싱 (warm function 재사용)
let fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const fontPath = path.join(
    process.cwd(),
    'node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff'
  );
  const buf = await readFile(fontPath);
  // satori 가 ArrayBuffer 형태 기대
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return fontCache;
}

// 모든 글 미리 인덱싱 → 슬러그로 빠르게 조회
let articleIndex: Map<string, CollectionEntry<'articles'>> | null = null;
async function findBySlug(slug: string): Promise<CollectionEntry<'articles'> | null> {
  if (!articleIndex) {
    const all = await getCollection('articles', ({ data }) => !data.draft);
    articleIndex = new Map(all.map((a) => [articleSlug(a), a]));
  }
  return articleIndex.get(slug) ?? null;
}

// 정적 빌드 경로 — hybrid 모드에서 SSR 이지만 명시.
export const getStaticPaths = async () => [];

export const GET: APIRoute = async ({ params }) => {
  const slug = String(params.slug ?? '');
  const article = await findBySlug(slug);
  if (!article) {
    return new Response('Not Found', { status: 404 });
  }

  const data = article.data;
  const cat = CATEGORIES[data.category];
  const p = PALETTES[data.category];
  const layout: HeroVariant = pickHeroVariant(slug);

  const font = await loadFont();

  // 페이지 안 HeroCard 와 동일한 시각을 satori 호환 노드 트리로 재구성.
  // satori 는 limited CSS — flexbox 만 지원, grid · container query 미지원.
  // 1200x630 (Open Graph 표준 비율 1.91:1, 거의 16:9)
  const W = 1200;
  const H = 630;
  const angle = layout === 'diagonal' ? 45 : 135;
  const bg = `linear-gradient(${angle}deg, ${p.bgA} 0%, ${p.bgB} 100%)`;

  // 변형별 노드 — HeroCard 의 6 layout 과 같은 의도 (단순화: satori 제약)
  type CSSObj = Record<string, string | number>;
  const root: CSSObj = {
    width: W, height: H, display: 'flex', position: 'relative',
    background: bg, fontFamily: 'Noto Sans KR',
    overflow: 'hidden',
  };

  // satori 는 이모지 미지원(별도 폰트 없이는 ⊠ 박스). 이모지 대신 카테고리별 컬러 도트로 대체.
  const chipNode = {
    type: 'div', props: {
      style: {
        position: 'absolute', bottom: 40, left: 50,
        display: 'flex', alignItems: 'center', gap: 10,
        background: p.accentBg, color: p.accentText,
        padding: '10px 24px', borderRadius: 9999,
        fontSize: 24, fontWeight: 700,
      },
      children: [
        { type: 'div', props: { style: { width: 12, height: 12, borderRadius: 9999, background: p.accentText, display: 'flex' } } },
        { type: 'div', props: { style: { display: 'flex' }, children: cat.name } },
      ],
    },
  };

  // 이모지 자리에 들어갈 카테고리별 도형 (SVG path 대신 div 모양 조합)
  const decoShape = (size: number, color: string, opacity: number) => ({
    type: 'div', props: {
      style: {
        width: size, height: size, borderRadius: 9999,
        background: color, opacity, display: 'flex',
      },
    },
  });
  const brandNode = {
    type: 'div', props: {
      style: {
        position: 'absolute', bottom: 48, right: 50,
        color: '#475569', fontSize: 20, fontWeight: 700, opacity: 0.8,
      },
      children: '헬스픽 · HealthPick',
    },
  };

  let layoutNodes: any[] = [];

  // 이모지를 못 쓰는 환경이라, 각 변형은 도형 (큰 원·삼각·다이아) 으로 시각 차별화.
  // 도형은 카테고리 accent 컬러 사용 → 카테고리 식별성 유지.
  if (layout === 'classic') {
    layoutNodes = [
      // big circle TR (배경 데코)
      { type: 'div', props: { style: { position: 'absolute', top: -60, right: -40, width: 380, height: 380, borderRadius: 9999, background: '#fff', opacity: 0.5, display: 'flex' } } },
      // 메인 컬러 큰 원
      { type: 'div', props: { style: { position: 'absolute', top: 60, right: 80, width: 260, height: 260, borderRadius: 9999, background: p.accentBg, opacity: 0.55, display: 'flex' } } },
      // small accent
      { type: 'div', props: { style: { position: 'absolute', top: 320, right: 200, width: 60, height: 60, borderRadius: 9999, background: p.accentBg, opacity: 0.4, display: 'flex' } } },
      // title TL
      { type: 'div', props: { style: { position: 'absolute', top: 100, left: 60, width: W * 0.6, fontSize: 76, fontWeight: 900, color: '#0f172a', lineHeight: 1.16, letterSpacing: '-0.02em', display: 'flex' }, children: data.title } },
    ];
  } else if (layout === 'pattern') {
    // 4x4 작은 원 도형 패턴 배경
    const tile = [];
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / 4), col = i % 4;
      tile.push({
        type: 'div', props: {
          style: {
            position: 'absolute',
            left: 90 + col * 280,
            top: 60 + row * 130,
            width: 56, height: 56, borderRadius: 9999,
            background: p.accentBg, opacity: 0.18,
            display: 'flex',
          },
        },
      });
    }
    layoutNodes = [
      ...tile,
      // 중앙 strong title with white bg
      { type: 'div', props: {
          style: {
            position: 'absolute', top: 200, left: 80, width: W - 160,
            background: 'rgba(255,255,255,0.78)', borderRadius: 12,
            padding: '24px 32px',
            display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
            fontSize: 70, fontWeight: 900, color: '#0f172a', lineHeight: 1.16, letterSpacing: '-0.02em',
          },
          children: data.title,
      } },
    ];
  } else if (layout === 'stripe') {
    layoutNodes = [
      { type: 'div', props: { style: { position: 'absolute', top: 0, bottom: 0, left: 0, width: W * 0.14, background: p.accentBg, display: 'flex' } } },
      // 스트라이프 위 큰 흰 원 (이모지 대체)
      { type: 'div', props: { style: { position: 'absolute', top: 200, left: 28, width: 110, height: 110, borderRadius: 9999, background: '#fff', opacity: 0.85, display: 'flex' } } },
      { type: 'div', props: { style: { position: 'absolute', top: 100, left: 240, width: W * 0.7, fontSize: 72, fontWeight: 900, color: '#0f172a', lineHeight: 1.16, letterSpacing: '-0.02em', display: 'flex' }, children: data.title } },
    ];
  } else if (layout === 'bubble') {
    const bubble = (x: number, y: number, size: number, op: number, color = '#fff') => ({
      type: 'div', props: { style: { position: 'absolute', top: y, left: x, width: size, height: size, borderRadius: 9999, background: color, opacity: op, display: 'flex' } },
    });
    layoutNodes = [
      bubble(-60, -70, 380, 0.45),
      bubble(W - 220, 60, 460, 0.35),
      bubble(W * 0.3, H - 80, 360, 0.40),
      bubble(W * 0.25, H * 0.35, 140, 0.55, p.accentBg),
      bubble(W * 0.6, H * 0.55, 190, 0.45, p.accentBg),
      { type: 'div', props: { style: { position: 'absolute', top: 100, left: 60, width: W * 0.6, fontSize: 72, fontWeight: 900, color: '#0f172a', lineHeight: 1.16, letterSpacing: '-0.02em', display: 'flex' }, children: data.title } },
    ];
  } else if (layout === 'diagonal') {
    layoutNodes = [
      // diagonal stripe
      { type: 'div', props: { style: { position: 'absolute', top: H * 0.42, left: -120, width: W + 240, height: H * 0.2, background: p.accentBg, opacity: 0.35, transform: 'rotate(-12deg)', display: 'flex' } } },
      // 우상단 큰 도형 (이모지 대체)
      { type: 'div', props: { style: { position: 'absolute', top: 50, right: 80, width: 160, height: 160, borderRadius: 9999, background: p.accentBg, opacity: 0.55, display: 'flex' } } },
      { type: 'div', props: { style: { position: 'absolute', bottom: 150, left: 60, width: W * 0.55, fontSize: 70, fontWeight: 900, color: '#0f172a', lineHeight: 1.16, letterSpacing: '-0.02em', display: 'flex' }, children: data.title } },
    ];
  } else { // minimal
    layoutNodes = [
      // 중앙 큰 컬러 도넛 (큰 원 + 내부 작은 배경색 원)
      { type: 'div', props: { style: { position: 'absolute', top: 80, left: W / 2 - 160, width: 320, height: 320, borderRadius: 9999, background: p.accentBg, opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: [
        { type: 'div', props: { style: { width: 140, height: 140, borderRadius: 9999, background: p.bgA, display: 'flex' } } },
      ] } },
      { type: 'div', props: { style: { position: 'absolute', top: 430, left: 80, width: W - 160, fontSize: 56, fontWeight: 900, color: '#0f172a', lineHeight: 1.16, letterSpacing: '-0.02em', textAlign: 'center', display: 'flex', justifyContent: 'center' }, children: data.title } },
    ];
  }

  const tree = {
    type: 'div',
    props: {
      style: root,
      children: [
        ...layoutNodes,
        chipNode,
        brandNode,
      ],
    },
  };

  const svg = await satori(tree as any, {
    width: W, height: H,
    fonts: [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();

  return new Response(png, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Hero-Variant': layout,
    },
  });
};
