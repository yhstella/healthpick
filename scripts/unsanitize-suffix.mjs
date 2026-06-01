// 어미 다양화 부작용 복원 — 사용자가 "빠듯가능하다" 같은 합쳐진 단어 + 톤 mix 지적.
// 가짜 다양화 < 자연 문체. 우리 sanitize-ai-patterns 의 어미 풀이 단순 substring 치환이라
// 한국어 단어 boundary 무시 → 광범위 부작용 (414 + 430 + 433 = 1,277건+).
//
// 복원:
//   1. 합쳐진 단어 패턴 → 원본 어미 형태로
//   2. 어색 톤 mix → ~합니다 체로 일관
//
// 단 메타 자기참조 ("본 글", "종합하면") 복원은 X — 그건 명백한 AI 시그널.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES = join(ROOT, 'src/content/articles');
const DRY_RUN = process.argv.includes('--dry-run');

function splitFrontmatter(content) {
  const m = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) return { frontmatter: '', body: content };
  return { frontmatter: m[1], body: m[2] };
}

// 복원 규칙 — 순서 중요 (긴 패턴 먼저)
// 합쳐진 단어 + 어색 톤 mix 둘 다 처리.
// 핵심 전략: ~한다/된다/가능하다 등 mixed 어미를 원본 ~합니다 체로 복원.
// 단, "본 글" 같은 메타 자기참조 복원은 안 함.
const RULES = [
  // === 합쳐진 단어 (가장 시급) ===
  // 1) [한글]가능할 수 있다. — 2회 치환 결과
  { re: /([가-힣])가능할 수 있다\./g, to: '$1할 수 있습니다.' },
  // 2) [한글]가능하다. — 활용가능하다 등
  { re: /([가-힣])가능하다\./g, to: '$1할 수 있습니다.' },
  // 3) [한글]쓸 수 있다. — 활용쓸 수 있다 등
  { re: /([가-힣])쓸 수 있다\./g, to: '$1할 수 있습니다.' },
  // 4) [한글]검토할 수 있다. — 사용 안 한 경우 패스
  { re: /([가-힣])검토할 수 있다\./g, to: '$1할 수 있습니다.' },
  // 5) [한글]해 둘 수 있다.
  { re: /([가-힣])해 둘 수 있다\./g, to: '$1할 수 있습니다.' },

  // === 어미 톤 mix — ~한다 / ~된다 단독 어미를 ~합니다 / ~됩니다 로 복원 ===
  // 단어 boundary: 줄 시작·공백·문장부호 뒤 + 한글어간 + 어미 + 마침표
  // "한다." 단독 (앞에 공백 또는 문장 시작) 만 — "결정한다" 같은 정상은 보존
  // 가장 확실히 어색한 케이스: "[2글자+한글 어간]+한다." (활용한다 같이 합성된 동사)
  // 모든 "한다." → "합니다." 일괄 (정상 ~한다도 일부 손해지만 quality 우선)
  // 안전 위해 좁은 패턴만:
  //  - "활용한다." / "사용한다." / "확인한다." / "신청한다." 같은 정상 동사도 함께 변환됨
  //  - 단 본문 톤 전체가 ~합니다 체로 통일되니 자연스러움 ↑

  // pool 의 short 어미들만 원본 어미로 복원
  // "권장된다." 풀 결과 복원:
  { re: /권장된다\./g, to: '권장됩니다.' },
  { re: /추천된다\./g, to: '추천됩니다.' },
  { re: /받는 게 안전하다\./g, to: '받는 것이 안전합니다.' },
  { re: /하는 게 일반적이다\./g, to: '하는 것이 일반적입니다.' },
  { re: /선택지가 된다\./g, to: '선택지가 됩니다.' },
  { re: /안내된다\./g, to: '안내됩니다.' },

  // "필요하다." 풀 결과 복원:
  { re: /필요하다\./g, to: '필요합니다.' },
  { re: /있어야 한다\./g, to: '있어야 합니다.' },
  { re: /꼭 확인해야 한다\./g, to: '꼭 확인해야 합니다.' },
  { re: /챙겨야 한다\./g, to: '챙겨야 합니다.' },

  // "있을 수 있습니다." 풀 결과 복원 (한정적):
  { re: /나타나기도 한다\./g, to: '나타나기도 합니다.' },
  { re: /드물지 않다\./g, to: '드물지 않습니다.' },
  { re: /경우에 따라 다르다\./g, to: '경우에 따라 다릅니다.' },

  // "할 수 있습니다." 풀의 "한다." "된다." 는 일반성이 너무 커서 일괄 변환 안 함
  // (예: "결정한다.", "적용된다." 등은 정상 한국어)
  // 다만 "[한글][2-4자 어간]한다." 패턴 중 합쳐진 단어는 위 가능하다/쓸 수 있다 fix 로 다수 해결
];

let totalFiles = 0;
let touchedFiles = 0;
let totalReplaces = 0;
const perRule = {};

const cats = readdirSync(ARTICLES).filter((d) => {
  try { return statSync(join(ARTICLES, d)).isDirectory(); } catch { return false; }
});

for (const cat of cats) {
  const cdir = join(ARTICLES, cat);
  for (const f of readdirSync(cdir).filter((x) => x.endsWith('.md'))) {
    totalFiles++;
    const path = join(cdir, f);
    const content = readFileSync(path, 'utf8');
    const { frontmatter, body } = splitFrontmatter(content);
    let newBody = body;
    let fileHits = 0;
    for (const { re, to } of RULES) {
      const matches = newBody.match(re);
      if (!matches) continue;
      const cnt = matches.length;
      newBody = newBody.replace(re, to);
      perRule[re.source] = (perRule[re.source] || 0) + cnt;
      fileHits += cnt;
    }
    if (fileHits === 0) continue;
    touchedFiles++;
    totalReplaces += fileHits;
    if (!DRY_RUN) writeFileSync(path, frontmatter + newBody, 'utf8');
  }
}

console.log('\n=========================================');
console.log(`DRY_RUN       : ${DRY_RUN}`);
console.log(`scanned files : ${totalFiles}`);
console.log(`touched files : ${touchedFiles}`);
console.log(`total replaces: ${totalReplaces}`);
console.log('=========================================');
console.log('Rule-by-rule (top 15):');
const sorted = Object.entries(perRule).sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [rule, cnt] of sorted) {
  console.log(`  ${cnt.toString().padStart(5)}  ${rule}`);
}
