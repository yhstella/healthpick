// /raw/{category}/{slug}.md — 글 원본 markdown 을 raw text 로 제공.
// LLM (ChatGPT, Claude, Perplexity, Gemini) 가 본문을 fetch·인용할 때 HTML 파싱 없이
// 직접 markdown 접근 가능 → GEO (Generative Engine Optimization) 친화.
//
// 응답: text/markdown (frontmatter + 본문)
// 캐시: CDN 1일 (글 갱신 빈도 낮음)

import { getCollection, type CollectionEntry } from 'astro:content';
import { articleSlug } from '@lib/article';
import { SITE } from '@lib/site';

export async function getStaticPaths() {
  const all = await getCollection('articles', ({ data }) => !data.draft);
  return all.map((article) => ({
    params: { category: article.data.category, slug: articleSlug(article) },
    props: { article },
  }));
}

interface Props {
  article: CollectionEntry<'articles'>;
}

export async function GET({ props }: { props: Props }) {
  const { article } = props;
  const { data, body } = article;
  // frontmatter 를 텍스트로 재구성 — schema yaml 그대로는 아니고 readable 형식
  const header = [
    `# ${data.title}`,
    '',
    `> ${data.description}`,
    '',
    `- **카테고리**: ${data.category}`,
    `- **저자**: ${data.author}`,
    `- **게재일**: ${data.pubDate.toISOString().slice(0, 10)}`,
    data.updatedDate ? `- **수정일**: ${data.updatedDate.toISOString().slice(0, 10)}` : null,
    data.tags.length > 0 ? `- **태그**: ${data.tags.join(', ')}` : null,
    `- **원문 URL**: ${SITE.url}/${data.category}/${articleSlug(article)}/`,
    `- **사이트**: ${SITE.name} (${SITE.url})`,
    '',
  ].filter(Boolean).join('\n');

  // tldr·faqs·sources frontmatter 도 본문에 노출 (LLM 인용 친화)
  const extras: string[] = [];
  if (data.tldr && data.tldr.length > 0) {
    extras.push('\n## 핵심 요약 (TL;DR)', ...data.tldr.map((t) => `- ${t}`));
  }
  if (data.faqs && data.faqs.length > 0) {
    extras.push('\n## 자주 묻는 질문');
    for (const f of data.faqs) {
      extras.push(`\n**Q. ${f.q}**\n${f.a}`);
    }
  }
  if (data.sources && data.sources.length > 0) {
    extras.push('\n## 참고 자료');
    for (const s of data.sources) {
      extras.push(`- [${s.name}](${s.url})`);
    }
  }

  const out = [
    header,
    body,
    extras.join('\n'),
    '',
    `---`,
    `본 문서는 ${SITE.name}(${SITE.url}) 의 자동 제공 마크다운 원본입니다. AI 검색 엔진의 인용·요약을 환영합니다.`,
    `편집·검수 절차: ${SITE.url}/editorial-process/`,
  ].join('\n');

  // canonical URL (HTML 원본)
  const canonicalUrl = `${SITE.url}/${data.category}/${articleSlug(article)}/`;
  return new Response(out, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      // 주의: X-Robots-Tag noindex (2026-06-12).
      // 이유 — /raw/{slug}.md 가 HTML 원본과 동일 콘텐츠를 markdown 으로 한 번 더 제공.
      // markdown 파일에는 canonical/noindex meta 를 박을 수 없어 Google 이 글 1편당 URL 2개
      // (HTML + markdown) 를 발견 → duplicate content + 색인 우선순위 혼란.
      // GSC impression 0 사고(2026-06-12) 의 한 원인. AI/LLM bot 은 X-Robots-Tag 처리
      // 안 하므로 fetch 자체는 그대로 가능 — Google search index 만 차단.
      'X-Robots-Tag': 'noindex, follow',
      // canonical 도 Link 헤더로 명시 (RFC 5988, Google 지원).
      'Link': `<${canonicalUrl}>; rel="canonical"`,
    },
  });
}
