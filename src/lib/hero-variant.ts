// 슬러그 → HeroCard 변형 인덱스 결정.
//
// 글마다 같은 변형이 영구적으로 매핑되어야 SEO 가 누적된다 (이미지 URL 안정성).
// 따라서 Math.random 금지 — FNV-1a 32bit 해시로 deterministic.
//
// 새 변형 추가 시:
//   1. HERO_VARIANTS 배열에 추가
//   2. HeroCard.astro 의 variant 별 분기에 같은 이름 추가
//   3. src/pages/og/[slug].png.ts 에도 같은 변형 추가

export const HERO_VARIANTS = [
  'classic',    // emoji top-right 큰 이모지, 2 circles, dots bottom-left (기존 디자인)
  'pattern',    // emoji 작게 타일링 배경, 데코 없음
  'stripe',     // 좌측 vertical accent stripe, 제목은 stripe 옆에
  'bubble',     // 큰 translucent circles 4~5 개, 이모지 우하단
  'diagonal',   // gradient 45°, 제목 좌하단, 우상단 작은 이모지
  'minimal',    // 데코 거의 없음, 큰 이모지 중앙, 제목 아래
] as const;

export type HeroVariant = (typeof HERO_VARIANTS)[number];

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function pickHeroVariant(slug: string): HeroVariant {
  const idx = fnv1a(slug) % HERO_VARIANTS.length;
  return HERO_VARIANTS[idx];
}
