// 토픽 슬러그 기반 deterministic 이미지 매칭.
// 같은 글은 항상 같은 이미지를 받는다. 카테고리 풀에서 해시로 선택.

import imagesData from '../data/images.json';
import type { CategorySlug } from './site';

type Photo = {
  id: string;
  slug: string;
  color?: string;
  blurHash?: string;
  width?: number;
  height?: number;
  description?: string;
  user: { name?: string; username?: string; link?: string };
  raw: string;
};

const POOLS = imagesData as Record<string, Record<string, Photo[]>>;

// 카테고리별 전체 photo 풀 (모든 키워드 합산).
const CATEGORY_POOLS: Record<string, Photo[]> = Object.fromEntries(
  Object.entries(POOLS).map(([cat, byKeyword]) => [
    cat,
    Object.values(byKeyword).flat(),
  ])
);

// 문자열 → 32bit 해시 (FNV-1a). 결정적이고 빠름.
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 원본 raw URL에 사이즈·압축 옵션을 덮어쓴 URL 생성.
function sizedUrl(raw: string, w: number, h: number): string {
  const u = new URL(raw);
  u.searchParams.set('w', String(w));
  u.searchParams.set('h', String(h));
  u.searchParams.set('fit', 'crop');
  u.searchParams.set('crop', 'entropy');
  u.searchParams.set('q', '80');
  u.searchParams.set('fm', 'webp');
  u.searchParams.set('auto', 'format');
  return u.toString();
}

export type ArticleImage = {
  src: string; // 카드용 (1200x675)
  srcThumb: string; // 작은 카드 (600x340)
  srcHero: string; // hero 큰 화면 (1920x1080)
  width: number;
  height: number;
  blurHash?: string;
  bgColor?: string;
  alt: string;
  attribution: {
    photographer: string;
    photographerUrl: string;
  };
};

export function pickImage(
  category: CategorySlug,
  slug: string,
  altText: string
): ArticleImage | null {
  const pool = CATEGORY_POOLS[category];
  if (!pool || pool.length === 0) return null;

  const idx = hashStr(`img|${category}|${slug}`) % pool.length;
  const p = pool[idx];
  if (!p) return null;

  return {
    src: sizedUrl(p.raw, 1200, 675),
    srcThumb: sizedUrl(p.raw, 600, 340),
    srcHero: sizedUrl(p.raw, 1920, 1080),
    width: 1200,
    height: 675,
    blurHash: p.blurHash,
    bgColor: p.color,
    alt: altText,
    attribution: {
      photographer: p.user?.name || 'Unsplash',
      photographerUrl: p.user?.link || 'https://unsplash.com',
    },
  };
}
