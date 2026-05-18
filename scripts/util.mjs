// Common helpers for content generation.

export function seedrand(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickN(rng, arr, n) {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) {
    const i = Math.floor(rng() * a.length);
    out.push(a.splice(i, 1)[0]);
  }
  return out;
}

export function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Romanize Korean for slug. Lightweight — not perfect, but stable.
const HANGUL_INIT = [
  'g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h',
];
const HANGUL_VOWEL = [
  'a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i',
];
const HANGUL_FINAL = [
  '','g','kk','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','ch','k','t','p','h',
];

export function slugify(input) {
  let s = '';
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const v = code - 0xac00;
      const i = Math.floor(v / 588);
      const j = Math.floor((v % 588) / 28);
      const k = v % 28;
      s += HANGUL_INIT[i] + HANGUL_VOWEL[j] + HANGUL_FINAL[k];
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      s += ch.toLowerCase();
    } else if (/\s/.test(ch) || ch === '-' || ch === '_') {
      s += '-';
    }
  }
  return s
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 한글 받침에 따라 조사를 자동 교정.
// 안전한 형태: {topic} 플레이스홀더 직후의 조사만 교정한다.
// 본문 전체를 사후 교정하면 동사 활용("있는", "묻는")이나 단어 일부("나이")까지
// 오교정될 수 있으므로 사용하지 않는다.
function hasJongseong(ch) {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

// {topic} 플레이스홀더와 그 직후의 조사를 안전하게 치환.
//   "{topic}을", "{topic}을(를)", "{topic}와(과)" 같은 패턴을 한 번에 처리.
export function replaceTopic(text, topic) {
  const last = topic[topic.length - 1];
  const j = hasJongseong(last);
  return text.replace(
    /\{topic\}(을\(를\)|이\(가\)|은\(는\)|와\(과\)|을|를|이|가|은|는|와|과)?/g,
    (m, particle) => {
      if (!particle) return topic;
      if (j === null) return topic + particle.replace(/\([^)]+\)/g, '');
      if (particle === '을' || particle === '를' || particle === '을(를)') return topic + (j ? '을' : '를');
      if (particle === '이' || particle === '가' || particle === '이(가)') return topic + (j ? '이' : '가');
      if (particle === '은' || particle === '는' || particle === '은(는)') return topic + (j ? '은' : '는');
      if (particle === '와' || particle === '과' || particle === '와(과)') return topic + (j ? '과' : '와');
      return topic + particle;
    }
  );
}

// (구버전 호환) 본문 전체 조사 교정. 새 코드에서는 replaceTopic을 사용할 것.
// 명시적 "X(Y)" 표기만 안전하게 정리한다. 단독 조사는 더 이상 건드리지 않는다.
export function fixKoreanParticles(text) {
  return text.replace(/([가-힣])(을|이|은|와)\((를|가|는|과)\)/g, (m, prev, a, b) => {
    const j = hasJongseong(prev);
    if (j === null) return m;
    if (a === '을' || b === '를') return prev + (j ? '을' : '를');
    if (a === '이' || b === '가') return prev + (j ? '이' : '가');
    if (a === '은' || b === '는') return prev + (j ? '은' : '는');
    if (a === '와' || b === '과') return prev + (j ? '과' : '와');
    return m;
  });
}

export function pubDateFor(seed) {
  // 페이지별 작성일을 일자·시·분·초까지 모두 다르게 분산.
  // - 24개월(약 730일) 범위로 늘려 자연스러운 누적 발행 형태로 보이게.
  // - 시·분·초를 무작위로 주어 같은 날짜라도 같은 타임스탬프가 절대 안 생기게.
  // - seed는 카테고리/그룹/토픽/앵글 조합이므로 같은 글은 항상 같은 날짜 (재생성해도 안정적).
  const rng = seedrand('pub_' + seed);
  const now = new Date('2026-05-19T09:00:00+09:00');
  const daysAgo = Math.floor(rng() * 730); // 0~729일
  const hour = Math.floor(rng() * 24);
  const min = Math.floor(rng() * 60);
  const sec = Math.floor(rng() * 60);
  const base = new Date(now.getTime() - daysAgo * 86400000);
  base.setUTCHours(hour, min, sec, 0);
  return base.toISOString();
}
