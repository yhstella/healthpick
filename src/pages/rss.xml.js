import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE, CATEGORIES, isPublicCategory } from '../lib/site.ts';
import { articleHref } from '../lib/article.ts';
import { articleRssDate, compareArticlePublication } from '../lib/article-dates.mjs';

export async function GET(context) {
  const articles = await getCollection('articles', ({ data }) => !data.draft && isPublicCategory(data.category));
  const sorted = articles.sort(compareArticlePublication).slice(0, 50);

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: sorted.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      ...articleRssDate(article.data.pubDateISO),
      categories: [CATEGORIES[article.data.category].name, ...article.data.tags],
      link: articleHref(article),
    })),
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    customData: `<language>ko-kr</language>`,
  });
}
