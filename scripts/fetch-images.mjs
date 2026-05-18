// 카테고리별 Unsplash 이미지를 키 없이 napi 엔드포인트로 자동 수집.
// 결과는 src/data/images.json 에 캐시되어 빌드 시 카드·hero에 사용됨.
//
// 사용:
//   node scripts/fetch-images.mjs          # 누락된 키워드만 보강 가져오기
//   node scripts/fetch-images.mjs --force  # 전체 재수집

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '..', 'src', 'data', 'images.json');

const FORCE = process.argv.includes('--force');

// 카테고리별 검색 키워드 (영어). 각 키워드당 PER_KEYWORD 장씩 모음.
// 같은 카테고리 안에서 다양성 확보를 위해 키워드 풀을 8~10개씩 잡음.
const KEYWORDS = {
  health: [
    'minimal hospital',
    'doctor stethoscope flat lay',
    'healthy food bowl',
    'fitness running outdoor',
    'yoga mat home',
    'vitamins natural',
    'medical clean white',
    'wellness lifestyle',
    'fresh vegetables minimal',
    'sleep bedroom morning',
  ],
  living: [
    'minimal kitchen',
    'cleaning home organized',
    'korean food recipe',
    'home interior bright',
    'family parenting moment',
    'cute pet dog cat',
    'home organization closet',
    'cooking ingredients top view',
    'living room cozy minimal',
    'laundry folded neat',
  ],
  finance: [
    'money savings calculator',
    'investment chart laptop',
    'korean won bills',
    'credit card minimalist',
    'piggy bank minimal',
    'real estate house key',
    'business calculator desk',
    'financial planning notebook',
    'coffee laptop minimal work',
    'graph chart finance',
  ],
  tech: [
    'minimal desk setup',
    'smartphone hand modern',
    'laptop screen code',
    'home office workspace',
    'wireless earbuds minimal',
    'mechanical keyboard close',
    'monitor desk clean',
    'tech gadgets flat lay',
    'cable management neat',
    'productivity workspace',
  ],
  auto: [
    'modern car closeup',
    'highway road sunset',
    'car dashboard interior',
    'tire wheel close',
    'parking lot urban',
    'electric vehicle charging',
    'auto mechanic garage',
    'car keys minimal',
    'long road trip',
    'motorcycle bike riding',
  ],
  travel: [
    'travel minimal landscape',
    'beach ocean blue',
    'mountain hiking trail',
    'city street europe',
    'airplane window view',
    'camping tent night',
    'travel suitcase preparation',
    'street food market asia',
    'korean traditional palace',
    'sunset golden hour landscape',
  ],
  study: [
    'open book reading',
    'study desk notebook',
    'library books shelf',
    'minimal workspace pen',
    'student learning laptop',
    'coffee book morning',
    'flat lay notebook stationery',
    'classroom modern',
    'japanese language books',
    'meditation focus calm',
  ],
};

const PER_KEYWORD = 5; // 키워드당 사진 N장

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// raw URL에서 ixid/ixlib 같은 추적 파라미터만 남기고 사이즈·압축 옵션을 우리가 지정.
function buildSized(raw, w, h) {
  // raw 형태: https://images.unsplash.com/photo-XXX?ixid=...&ixlib=...
  // 추가/덮어쓸 파라미터: w, h, fit=crop, crop=entropy, q=80, fm=webp, auto=format
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

async function fetchSearch(query) {
  // napi는 빈 헤더로 호출하면 통과, Accept/UA 추가하면 401 반환 (봇 탐지 추정).
  const u = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${PER_KEYWORD}&orientation=landscape`;
  const res = await fetch(u);
  if (!res.ok) {
    console.warn(`! ${query}: HTTP ${res.status}`);
    return [];
  }
  const json = await res.json();
  const items = (json.results || [])
    // Unsplash+(premium) 사진은 유료 구독 필요하므로 제외. 무료 사용 가능한 images.unsplash.com 만 사용.
    .filter((p) => p.urls?.raw && !p.urls.raw.includes('plus.unsplash.com'))
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      color: p.color,
      blurHash: p.blur_hash,
      width: p.width,
      height: p.height,
      description: p.description || p.alt_description || '',
      user: { name: p.user?.name, username: p.user?.username, link: p.user?.links?.html },
      // 캐시에는 raw 만 저장하고, 사용 시점에 사이즈 조정.
      raw: p.urls.raw,
    }));
  return items;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  let cache = {};
  if (fs.existsSync(OUT_FILE) && !FORCE) {
    cache = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  }

  let totalFetched = 0;
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    cache[category] = cache[category] || {};
    for (const kw of keywords) {
      if (!FORCE && cache[category][kw] && cache[category][kw].length >= PER_KEYWORD) {
        continue;
      }
      console.log(`[${category}] ${kw}...`);
      const items = await fetchSearch(kw);
      cache[category][kw] = items;
      totalFetched += items.length;
      await sleep(400); // 친절한 요청 간격
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(cache, null, 2), 'utf8');

  // 통계
  let perCat = {};
  for (const [c, m] of Object.entries(cache)) {
    perCat[c] = Object.values(m).reduce((s, arr) => s + arr.length, 0);
  }
  console.log(`\n✅ done. fetched=${totalFetched} new`);
  console.log('cache totals by category:');
  for (const [c, n] of Object.entries(perCat)) console.log(`  ${c.padEnd(8)} ${n} photos`);
  console.log(`\nsaved to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
