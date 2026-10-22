import type { CollectionEntry } from 'astro:content';

export function articleBody(article: CollectionEntry<'articles'>): string {
  if (article.body === undefined) {
    throw new Error(`Missing Markdown body for article: ${article.id}`);
  }
  return article.body;
}

export function articleSlug(article: CollectionEntry<'articles'>): string {
  const cat = article.data.category;
  return article.id.startsWith(cat + '/')
    ? article.id.slice(cat.length + 1)
    : article.id;
}

export function articleHref(article: CollectionEntry<'articles'>): string {
  return `/${article.data.category}/${articleSlug(article)}/`;
}
