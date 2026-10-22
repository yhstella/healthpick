import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { currentMedicalReview } from '../../src/lib/medical-review.ts';

const markdown = unified().use(remarkParse).use(remarkGfm);

function externalUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function externalLinks(node, links = new Set()) {
  if (node.type === 'link' || node.type === 'definition') {
    const url = externalUrl(node.url);
    if (url) links.add(url);
  }
  for (const child of node.children ?? []) externalLinks(child, links);
  return [...links];
}

export function inspectArticle(source, file) {
  const { data, content } = matter(source);
  const sources = Array.isArray(data.sources) ? data.sources : [];
  const metadataUrls = sources.map((entry) => externalUrl(entry.url)).filter(Boolean);
  const bodyUrls = externalLinks(markdown.parse(content));
  const allUrls = [...new Set([...metadataUrls, ...bodyUrls])];
  const homepageUrls = allUrls.filter((value) => {
    const url = new URL(value);
    return url.pathname === '/' && !url.search && !url.hash;
  });
  const normalized = { ...data, tldr: data.tldr ?? [], faqs: data.faqs ?? [], sources };
  const review = currentMedicalReview(normalized, content);
  const flags = [];
  if (!allUrls.length) flags.push('no-external-reference');
  if (homepageUrls.length) flags.push('homepage-reference-needs-review');
  if (data.manual !== true) flags.push('manual-protection-missing');
  if (data.medical && !review) flags.push('current-medical-review-not-recorded');
  return {
    file,
    title: data.title,
    category: data.category,
    draft: data.draft === true,
    pubDate: new Date(data.pubDate).toISOString().slice(0, 10),
    updatedDate: data.updatedDate ? new Date(data.updatedDate).toISOString().slice(0, 10) : null,
    manual: data.manual === true,
    medical: data.medical === true,
    metadataUrls,
    bodyUrls,
    homepageUrls,
    reviewStatus: review ? 'matching-record' : data.medicalReview ? 'stale-record' : 'not-recorded',
    flags,
  };
}

export function inventoryHealth(root) {
  const directory = join(root, 'src/content/articles/health');
  return readdirSync(directory).filter((file) => file.endsWith('.md')).sort().map((file) =>
    inspectArticle(readFileSync(join(directory, file), 'utf8'), `src/content/articles/health/${file}`)
  );
}

export function summarizeInventory(articles) {
  const published = articles.filter((article) => !article.draft);
  const flags = {};
  for (const article of published) {
    for (const flag of article.flags) flags[flag] = (flags[flag] ?? 0) + 1;
  }
  return { healthArticles: articles.length, published: published.length, drafts: articles.length - published.length, flags };
}
