import assert from 'node:assert/strict';
import test from 'node:test';
import { sitemapArticleMetadata, buildArticleLastmodMap } from '../scripts/lib/sitemap-metadata.mjs';
import { inventoryHealth } from '../scripts/lib/content-inventory.mjs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slug } from 'github-slugger';

test('uses the actual normalized route and actual update date', () => {
  const result = sitemapArticleMetadata('---\npubDate: 2026-05-01\nupdatedDate: "2026-10-23"\n---\nBody', 'health', 'test-1.2-MRI.md');
  assert.deepEqual(result, { pathname: '/health/test-12-mri/', lastmod: '2026-10-23T00:00:00.000Z' });
});

test('does not assign build time or dates to drafts and undated content', () => {
  assert.equal(sitemapArticleMetadata('---\ndraft: true\npubDate: 2026-10-23\n---\nBody', 'health', 'draft.md'), null);
  assert.equal(sitemapArticleMetadata('---\ntitle: Test\n---\nBody', 'health', 'test.md'), null);
  assert.equal(sitemapArticleMetadata('---\npubDate: invalid\n---\nBody', 'health', 'test.md'), null);
});

test('every published health article has a date under its actual route', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const map = buildArticleLastmodMap(resolve(root, 'src/content/articles'), ['health']);
  for (const article of inventoryHealth(root).filter((article) => !article.draft)) {
    const path = `/health/${slug(basename(article.file, '.md'))}/`;
    assert.equal(map.get(path).slice(0, 10), article.updatedDate ?? article.pubDate, article.file);
    assert.equal(map.get(encodeURI(path)), map.get(path));
  }
});
