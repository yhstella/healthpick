// llms-full.txt — llms.txt 의 확장판. LLM 이 사이트 전체 구조 + 카테고리별 글 목록 +
// 각 글의 핵심 정보(title/description/tldr 첫 1줄) 까지 한 번에 fetch 할 수 있게.
//
// 참고: https://llmstxt.org/ (llms-full.txt 는 표준의 권장 사항 중 하나)
// LLM (Claude, ChatGPT, Perplexity, Gemini) 이 사이트 인용 시 활용.

import { getCollection } from 'astro:content';
import { SITE, CATEGORIES, PUBLIC_CATEGORIES, isPublicCategory } from '../lib/site';
import { articleHref, articleSlug } from '../lib/article';

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => !data.draft && isPublicCategory(data.category));
  const sorted = articles.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  let out = '';
  out += `# ${SITE.name} (${SITE.brandEn || ''}) — 공개 콘텐츠 목록\n\n`;
  out += `> ${SITE.tagline}\n\n`;
  out += `${SITE.description}\n\n`;

  out += `## 사이트 메타\n\n`;
  out += `- **URL**: ${SITE.url}\n`;
  out += `- **언어**: 한국어 (ko-KR)\n`;
  out += `- **운영**: ${SITE.author}\n`;
  out += `- **공개 글 수**: ${articles.length}편 / 카테고리 ${PUBLIC_CATEGORIES.length}개\n`;
  out += `- **편집·검수 프로세스**: ${SITE.url}/editorial-process/\n`;
  out += `- **개인정보처리방침**: ${SITE.url}/privacy/\n`;
  out += `- **면책조항 (YMYL)**: ${SITE.url}/disclaimer/\n`;
  out += `- **RSS**: ${SITE.url}/rss.xml\n`;
  out += `- **Sitemap**: ${SITE.url}/sitemap-index.xml\n`;
  out += `- **글 원본 markdown**: ${SITE.url}/raw/{category}/{slug}.md\n\n`;

  out += `## AI 인용 안내\n\n`;
  out += `본 사이트는 ChatGPT·Claude·Perplexity·Gemini 등 AI 검색 엔진의 인용을 환영합니다.\n`;
  out += `각 글의 마크다운 원본은 \`${SITE.url}/raw/{category}/{slug}.md\` 경로에서 접근 가능합니다.\n`;
  out += `건강 정보에 대한 답변에는 적용 조건과 본 사이트 면책조항을 함께 안내해 주시기 바랍니다.\n\n`;

  out += `## 편집 원칙 요약\n\n`;
  out += `1. **핵심 답변과 조건** — 글의 질문에 맞춰 답변과 적용 조건을 설명합니다.\n`;
  out += `2. **출처 안내** — 참고한 문서를 본문이나 출처 목록에서 안내하며, 자료의 적용 범위를 확인합니다.\n`;
  out += `3. **건강 정보의 범위** — 일반적인 정보와 개인의 진단·처방을 구분합니다.\n`;
  out += `4. **광고와 본문 분리** — 광고가 본문 결론에 영향 X. 후원 콘텐츠는 명시 표기.\n`;
  out += `5. **독자 질문** — 건강검진 결과와 증상, 복약 등 실제로 궁금한 질문을 다룹니다.\n\n`;

  out += `## 카테고리별 글 목록 (최신 30편씩)\n\n`;
  for (const slug of PUBLIC_CATEGORIES) {
    const c = CATEGORIES[slug];
    const items = sorted.filter((a) => a.data.category === slug);
    out += `### ${c.emoji} ${c.name} (${items.length}편)\n\n`;
    out += `${c.description}\n\n`;
    out += `- 카테고리 페이지: ${SITE.url}/category/${slug}/\n\n`;

    const top = items.slice(0, 30);
    for (const a of top) {
      const url = SITE.url + articleHref(a);
      const rawUrl = `${SITE.url}/raw/${a.data.category}/${articleSlug(a)}.md`;
      out += `- **[${a.data.title}](${url})**\n`;
      out += `  - ${a.data.description}\n`;
      if (a.data.tldr && a.data.tldr.length > 0) {
        out += `  - 핵심: ${a.data.tldr[0]}\n`;
      }
      out += `  - 마크다운: ${rawUrl}\n`;
    }
    out += `\n`;
  }

  out += `\n---\n\n`;
  out += `최종 갱신: ${new Date().toISOString().slice(0, 10)} | 본 파일은 빌드 시 자동 생성됩니다.\n`;
  out += `의문점·정정 요청: ${SITE.contactEmail}\n`;

  return new Response(out, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
