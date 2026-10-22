import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectArticle, summarizeInventory } from '../scripts/lib/content-inventory.mjs';

const frontmatter = '---\ntitle: Test article\ncategory: health\npubDate: 2026-10-23\nmedical: true\nmanual: true\n';

test('counts Markdown, bare GFM and reference-style source links', () => {
  const article = inspectArticle(frontmatter + '---\n[Guide](https://example.org/guide)\n\nhttps://example.org/plain\n\n[Ref][source]\n\n[source]: https://example.org/reference\n', 'test.md');
  assert.equal(article.bodyUrls.length, 3);
  assert(!article.flags.includes('no-external-reference'));
});

test('parses YAML sources and distinguishes homepages from document links', () => {
  const article = inspectArticle(frontmatter + 'sources:\n  - name: Root\n    url: https://example.org/\n  - name: Document\n    url: https://example.org/guide?id=1\n---\nText.', 'test.md');
  assert.equal(article.metadataUrls.length, 2);
  assert.deepEqual(article.homepageUrls, ['https://example.org/']);
  assert(article.flags.includes('homepage-reference-needs-review'));
});

test('does not treat a URL example in a code block as a cited source', () => {
  const article = inspectArticle(frontmatter + '---\n```text\nhttps://example.org/not-a-source\n```\n', 'test.md');
  assert(article.flags.includes('no-external-reference'));
});

test('summary excludes drafts and does not infer medical review from dates', () => {
  const article = inspectArticle(frontmatter + 'updatedDate: 2026-10-23\n---\nText.', 'test.md');
  assert.equal(article.reviewStatus, 'not-recorded');
  const draft = inspectArticle(frontmatter + 'draft: true\n---\nText.', 'draft.md');
  const summary = summarizeInventory([article, draft]);
  assert.equal(summary.published, 1);
  assert.equal(summary.drafts, 1);
  assert.equal(summary.flags['no-external-reference'], 1);
});
