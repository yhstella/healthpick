import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE, CATEGORIES } from '../lib/site.ts';
import { articleHref } from '../lib/article.ts';

export async function GET(context) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const sorted = articles.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()).slice(0, 50);

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: sorted.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.pubDate,
      categories: [CATEGORIES[article.data.category].name, ...article.data.tags],
      link: articleHref(article),
    })),
    customData: `<language>ko-kr</language>`,
  });
}
