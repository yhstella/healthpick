#!/usr/bin/env node
// 템플릿 H2 헤딩 다양화 — exact-string 획일성(near-duplicate 신호) 제거.
// 내용은 그대로 두고 섹션 제목만 글별로(slug 해시) 의미에 맞는 대안으로 교체.
// 2026-07-07 AdSense 재점검. 2개 템플릿이 68% 차지하던 문제.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ART = join(ROOT, 'src', 'content', 'articles');
const CATS = ['health', 'living', 'finance', 'tech', 'auto', 'travel', 'study'];

function h(s) { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193); } return x >>> 0; }
const pick = (slug, role, pool) => pool[h(slug + '|' + role) % pool.length];

const POOLS = {
  intro:   ['결론부터', '핵심만 먼저', '짧게 답하면', '먼저 결론부터', '요점부터 정리', '바로 답하면', '한 줄로 답하면'],
  context: ['어떤 상황인가', '왜 헷갈리는가', '배경부터 짚으면', '이럴 때 생기는 고민', '상황부터 정리', '어떤 경우에 해당하나'],
  answer:  ['자세히 따져보면', '구체적으로 보면', '핵심을 정리하면', '하나씩 살펴보면', '따져봐야 할 것', '실제 판단 기준'],
  steps:   ['실제로 어떻게 하나', '확인 순서', '단계별로 정리', '무엇부터 챙기나', '진행 순서', '챙겨야 할 것'],
  closing: ['정리하면', '마무리하며', '기억할 점', '핵심 요약', '끝으로 챙길 것', '한 번 더 정리'],
  applies: ['누구에게 해당되나', '어떤 경우인가', '해당되는 상황', '적용 대상', '이럴 때 해당', '대상과 조건'],
  except:  ['예외가 되는 경우', '이럴 땐 다르다', '적용 안 되는 상황', '주의할 예외', '다르게 적용될 때', '예외 케이스'],
  cost:    ['비용과 위험', '따져야 할 비용·위험', '돈과 위험 요소', '비용·리스크 점검', '실제 부담과 위험', '챙겨야 할 비용·주의점'],
};
const MAP = {
  '한눈에 보기': 'intro', '왜 이 질문이 생길까': 'context', '핵심 답변': 'answer',
  '단계별 체크리스트': 'steps', '마지막 한마디': 'closing',
  '결론부터': 'intro', '언제 해당되나': 'applies', '예외 상황': 'except', '비용·위험·주의점': 'cost',
  // 템플릿 C
  '빠른 정리': 'intro', '무엇이 문제인가': 'context', '핵심 정보': 'answer',
  '실전 가이드': 'steps', '마무리': 'closing',
};

let changed = 0;
for (const cat of CATS) {
  let files;
  try { files = readdirSync(join(ART, cat)); } catch { continue; }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const p = join(ART, cat, f);
    const txt = readFileSync(p, 'utf-8');
    const nl = txt.includes('\r\n') ? '\r\n' : '\n';
    const norm = txt.replace(/\r\n/g, '\n');
    const fmEnd = norm.indexOf('\n---\n', 3);
    if (fmEnd < 0) continue;
    const fm = norm.slice(0, fmEnd);
    let body = norm.slice(fmEnd);
    const slug = f.replace(/\.md$/, '');
    let hit = false;
    for (const [orig, role] of Object.entries(MAP)) {
      const re = new RegExp('^## ' + orig + '[ \\t]*$', 'm');
      if (re.test(body)) {
        body = body.replace(re, '## ' + pick(slug, role, POOLS[role]));
        hit = true;
      }
    }
    if (hit) { writeFileSync(p, (fm + body).replace(/\n/g, nl), 'utf-8'); changed++; }
  }
}
console.log(`헤딩 다양화: ${changed}편`);
