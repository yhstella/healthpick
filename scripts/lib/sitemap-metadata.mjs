import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { slug } from 'github-slugger';
import { articleFrontmatter } from './article-frontmatter.mjs';
import { normalizeArticleDate } from '../../src/lib/article-dates.mjs';

export function sitemapArticleImage(page, site) {
  const path = new URL(page, site).pathname;
  const match = path.match(/^\/(health|living|finance|tech|auto|travel|study)\/([^/]+)\/?$/);
  if (!match) return null;
  return new URL(`/og/${encodeURIComponent(decodeURIComponent(match[2]))}.png`, site).href;
}

export function sitemapArticleMetadata(source, category, filename) {
  const data = articleFrontmatter(source);
  if (data.draft === true) return null;
  const value = data.updatedDate ?? data.pubDate;
  if (!value) return null;
  let lastmod;
  try { lastmod = normalizeArticleDate(value); } catch { return null; }
  return {
    pathname: `/${category}/${slug(filename.replace(/\.md$/, ''))}/`,
    lastmod,
  };
}

export function buildArticleLastmodMap(directory, categories) {
  const map = new Map();
  for (const category of categories) {
    let files;
    try { files = readdirSync(join(directory, category)); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const filename of files.filter((file) => file.endsWith('.md'))) {
      const record = sitemapArticleMetadata(readFileSync(join(directory, category, filename), 'utf8'), category, filename);
      if (!record) continue;
      if (map.has(record.pathname)) throw new Error(`Duplicate article route: ${record.pathname}`);
      map.set(record.pathname, record.lastmod);
      map.set(encodeURI(record.pathname), record.lastmod);
    }
  }
  return map;
}
