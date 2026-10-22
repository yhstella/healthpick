import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import config from '../astro.config.mjs';
import { articleBody, articleHref, articleSlug } from '../src/lib/article.ts';

test('content layer IDs retain category-relative public article routes', () => {
  for (const id of ['health/tsh-7', 'health/a1c-6-1', 'health/\uac74\uac15\uac80\uc9c4']) {
    const article = { id, data: { category: 'health' }, body: 'Body' };
    assert.equal(articleSlug(article), id.slice('health/'.length));
    assert.equal(articleHref(article), `/${id}/`);
  }
  assert.equal(articleSlug({ id: 'tsh-7', data: { category: 'health' } }), 'tsh-7');
  assert.equal(articleSlug({ id: 'healthcare/guide', data: { category: 'health' } }), 'healthcare/guide');
});

test('missing loader content fails explicitly instead of publishing an empty article', () => {
  assert.equal(articleBody({ id: 'health/guide', body: '\nBody\n' }), '\nBody\n');
  assert.equal(articleBody({ id: 'health/empty', body: '' }), '');
  assert.throws(() => articleBody({ id: 'health/missing' }), /Missing Markdown body.*health\/missing/);
});

test('unified processor preserves ranges, GFM tables and heading anchors', async () => {
  const renderer = await config.markdown.processor.createRenderer({ syntaxHighlight: false });
  const rendered = await renderer.render('## Range 60~100\n\n60~80 IU/L and 6~12 months. **Bold** text. ~~Removed~~\n\n| A | B |\n| - | - |\n| 1 | 2 |');
  assert(rendered.code.includes('60~80 IU/L and 6~12 months.'));
  assert(rendered.code.includes('<strong>Bold</strong> text.'));
  assert(rendered.code.includes('<del>Removed</del>'));
  assert.equal((rendered.code.match(/<del>/g) ?? []).length, 1);
  assert(rendered.code.includes('<table>'));
  assert.deepEqual(rendered.metadata.headings, [{ depth: 2, slug: 'range-60100', text: 'Range 60~100' }]);
});

test('migration retains static output, old inline spacing and Tailwind 3 PostCSS pipeline', () => {
  assert.equal(config.output, 'static');
  assert.equal(config.compressHTML, true);
  const require = createRequire(import.meta.url);
  assert.deepEqual(Object.keys(require('../postcss.config.cjs').plugins), ['tailwindcss', 'autoprefixer']);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert(pkg.dependencies.tailwindcss.startsWith('^3.'));
  assert.equal(pkg.dependencies['@astrojs/tailwind'], undefined);
});
