import type { CollectionEntry } from 'astro:content';

export function articleSlug(article: CollectionEntry<'articles'>): string {
  const cat = article.data.category;
  return article.slug.startsWith(cat + '/')
    ? article.slug.slice(cat.length + 1)
    : article.slug;
}

export function articleHref(article: CollectionEntry<'articles'>): string {
  return `/${article.data.category}/${articleSlug(article)}/`;
}
