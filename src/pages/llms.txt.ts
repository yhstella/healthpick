import { getCollection } from 'astro:content';
import { SITE, CATEGORIES, CATEGORY_ORDER } from '../lib/site';
import { articleHref } from '../lib/article';

// llms.txt — Anthropic 주도의 LLM 친화 사이트 설명 표준.
// LLM/AI Overview 가 이 파일을 읽어 사이트 구조를 빠르게 파악할 수 있게 한다.
// 참고: https://llmstxt.org

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
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
  out += `- 총 글 수: ${articles.length}개 / 카테고리: ${CATEGORY_ORDER.length}개\n`;
  out += `- RSS: ${SITE.url}/rss.xml\n`;
  out += `- Sitemap: ${SITE.url}/sitemap-index.xml\n`;
  out += `- 면책: ${SITE.url}/disclaimer/\n\n`;

  out += `## 편집 원칙 요약\n\n`;
  out += `- 일반인 대상 정보 제공이 목적이며, 전문 진단·처방·투자 권유를 대체하지 않습니다.\n`;
  out += `- YMYL(건강·재무) 영역은 본문 하단에 면책 안내를 명시합니다.\n`;
  out += `- 본문 첫 섹션의 "한눈에 보는 핵심(TL;DR)"은 사실 단정형으로 작성된 3줄 요약입니다.\n\n`;

  out += `## 카테고리\n\n`;
  for (const slug of CATEGORY_ORDER) {
    const c = CATEGORIES[slug];
    const count = articles.filter((a) => a.data.category === slug).length;
    out += `### ${c.emoji} ${c.name} (${count}편)\n\n`;
    out += `${c.description}\n\n`;
    out += `- 목록: ${SITE.url}/category/${slug}/\n`;

    const top = articles
      .filter((a) => a.data.category === slug)
      .slice(0, 12);
    out += `- 대표 글:\n`;
    for (const a of top) {
      const url = SITE.url + articleHref(a);
      out += `  - [${a.data.title}](${url})\n`;
    }
    out += `\n`;
  }

  out += `## 최근 글 (전체 카테고리에서 최신순 30편)\n\n`;
  for (const a of sorted.slice(0, 30)) {
    const url = SITE.url + articleHref(a);
    out += `- [${a.data.title}](${url}) — ${a.data.description}\n`;
  }

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
