import { getCollection } from 'astro:content';
import { SITE, CATEGORIES, PUBLIC_CATEGORIES, isPublicCategory } from '../lib/site';
import { articleHref } from '../lib/article';

// llms.txt — Anthropic 주도의 LLM 친화 사이트 설명 표준.
// LLM/AI Overview 가 이 파일을 읽어 사이트 구조를 빠르게 파악할 수 있게 한다.
// 참고: https://llmstxt.org

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => !data.draft && isPublicCategory(data.category));
  const sorted = articles.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  let out = '';
  out += `# ${SITE.name} (${SITE.brandEn || ''})\n\n`;
  out += `> ${SITE.tagline}\n\n`;
  out += `${SITE.description}\n\n`;

  out += `## 사이트 정보\n\n`;
  out += `- 주소: ${SITE.url}\n`;
  out += `- 운영: ${SITE.author} (편집 원칙: ${SITE.url}/author/healthpick-team/)\n`;
  out += `- 언어: 한국어 (ko-KR)\n`;
  out += `- 공개 글 수: ${articles.length}개 / 카테고리: ${PUBLIC_CATEGORIES.length}개\n`;
  out += `- RSS: ${SITE.url}/rss.xml\n`;
  out += `- Sitemap: ${SITE.url}/sitemap-index.xml\n`;
  out += `- 면책: ${SITE.url}/disclaimer/\n\n`;

  out += `## 편집 원칙 요약\n\n`;
  out += `- 일반인 대상 건강 정보 제공이 목적이며, 전문 진단·처방을 대체하지 않습니다.\n`;
  out += `- 핵심 답변과 적용 조건을 설명하고, 개인의 진료와 구분합니다.\n`;
  out += `- 글의 질문에 맞춰 구성하며, 참고한 자료는 본문이나 출처 목록에서 안내합니다.\n\n`;

  out += `## 카테고리\n\n`;
  for (const slug of PUBLIC_CATEGORIES) {
    const c = CATEGORIES[slug];
    const count = articles.filter((a) => a.data.category === slug).length;
    out += `### ${c.emoji} ${c.name} (${count}편)\n\n`;
    out += `${c.description}\n\n`;
    out += `- 목록: ${SITE.url}/category/${slug}/\n`;

    const top = sorted
      .filter((a) => a.data.category === slug)
      .slice(0, 12);
    out += `- 대표 글:\n`;
    for (const a of top) {
      const url = SITE.url + articleHref(a);
      out += `  - [${a.data.title}](${url})\n`;
    }
    out += `\n`;
  }

  out += `## 최근 공개 글 (최신순 30편)\n\n`;
  for (const a of sorted.slice(0, 30)) {
    const url = SITE.url + articleHref(a);
    out += `- [${a.data.title}](${url}) — ${a.data.description}\n`;
  }

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
