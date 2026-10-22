import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getRssString } from '@astrojs/rss';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { articleCalendarDate, articleRssDate, formatArticleDate, normalizeArticleDate } from '../src/lib/article-dates.mjs';
import { articleFrontmatter } from '../scripts/lib/article-frontmatter.mjs';
import { preserveArticleDates } from '../scripts/lib/article-date-loader.mjs';
import { sitemapArticleMetadata } from '../scripts/lib/sitemap-metadata.mjs';

test('YAML dates retain source precision regardless of quoting', () => {
  for (const value of ['2026-10-23', '"2026-10-23"', "'2026-10-23'"]) {
    assert.equal(articleFrontmatter(`---\npubDate: ${value}\n---\nBody`).pubDate, '2026-10-23');
  }
  const midnight = '2026-07-12T09:00:00+09:00';
  assert.equal(articleFrontmatter(`---\npubDate: ${midnight}\n---\nBody`).pubDate, midnight);
});

test('calendar days stay dates and explicit midnight stays an instant', () => {
  assert.equal(normalizeArticleDate('2026-10-23'), '2026-10-23');
  assert.equal(normalizeArticleDate('2026-07-12T09:00:00+09:00'), '2026-07-12T00:00:00.000Z');
  assert.equal(normalizeArticleDate('2026-07-30T00:00:00.000Z'), '2026-07-30T00:00:00.000Z');
  assert.equal(normalizeArticleDate('2026-05-19T23:59:00.123Z'), '2026-05-19T23:59:00.123Z');
});

test('invalid dates, ambiguous local timestamps and already-coerced dates fail validation', () => {
  for (const value of ['2026-02-29', '2026-02-30T12:00:00Z', '2026-13-01', '2026-10-23T24:00:00Z', '2026-10-23T12:00:00', '', null, new Date('2026-10-23')]) {
    assert.throws(() => normalizeArticleDate(value), undefined, String(value));
  }
  assert.equal(normalizeArticleDate('2024-02-29'), '2024-02-29');
});

test('human and raw calendar dates use Korea time only for actual instants', () => {
  assert.equal(articleCalendarDate('2026-10-23'), '2026-10-23');
  assert.equal(articleCalendarDate('2026-05-19T23:59:00.000Z'), '2026-05-20');
  assert.equal(articleCalendarDate('2026-05-19T14:59:59Z'), '2026-05-19');
  assert.equal(articleCalendarDate('2026-05-19T15:00:00Z'), '2026-05-20');
  assert.equal(formatArticleDate('2026-10-23'), '2026년 10월 23일');
});

test('formatting and serialization do not depend on the build host timezone', () => {
  const module = new URL('../src/lib/article-dates.mjs', import.meta.url).href;
  const script = `import {formatArticleDate,articleCalendarDate,normalizeArticleDate} from ${JSON.stringify(module)};console.log(JSON.stringify(['2026-10-23','2026-05-19T23:59:00.000Z','2026-07-12T09:00:00+09:00'].map(x=>[formatArticleDate(x),articleCalendarDate(x),normalizeArticleDate(x)])));`;
  const outputs = ['UTC', 'Asia/Seoul', 'America/Los_Angeles'].map(TZ => execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }));
  assert.equal(outputs[0], outputs[1]);
  assert.equal(outputs[0], outputs[2]);
});

test('loader restores only dates and retains glob rendering, IDs and watcher context', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'healthpick-date-loader-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'article.md');
  writeFileSync(filePath, '---\npubDate: 2026-10-23\nupdatedDate: 2026-07-12T09:00:00+09:00\n---\nBody');
  const watcher = {};
  let received;
  const entry = { id: 'health/guide', filePath, data: { title: 'Keep title', pubDate: new Date('2026-10-23'), updatedDate: new Date('2026-07-12'), heroImage: 'image.png' } };
  const loader = preserveArticleDates({ name: 'glob-loader', async load(context) {
    assert.equal(context.watcher, watcher);
    received = await context.parseData(entry);
  } });
  await loader.load({ watcher, async parseData(value) { return value; } });
  assert.equal(received.id, entry.id);
  assert.equal(received.filePath, filePath);
  assert.deepEqual(received.data, { ...entry.data, pubDate: '2026-10-23', updatedDate: '2026-07-12T09:00:00+09:00' });
});

test('RSS has a date-only extension without inventing an RFC822 time, and keeps real times', async () => {
  const xml = await getRssString({ title: 'Dates', description: 'Dates', site: 'https://healthpick.kr', xmlns: { dc: 'http://purl.org/dc/elements/1.1/' }, items: [
    { title: 'Day', link: '/day/', ...articleRssDate('2026-10-23') },
    { title: 'Instant', link: '/instant/', ...articleRssDate('2026-05-19T23:59:00.000Z') },
  ] });
  assert.equal(XMLValidator.validate(xml), true);
  const document = new XMLParser({ ignoreAttributes: false }).parse(xml);
  assert.equal(document.rss['@_xmlns:dc'], 'http://purl.org/dc/elements/1.1/');
  const [day, instant] = document.rss.channel.item;
  assert.equal(day['dc:date'], '2026-10-23');
  assert.equal(day.pubDate, undefined);
  assert.equal(new Date(instant.pubDate).toISOString(), '2026-05-19T23:59:00.000Z');
  assert.equal(instant['dc:date'], undefined);
});

test('sitemap metadata preserves date-only values and explicit midnight timestamps separately', () => {
  for (const [source, expected] of [['2026-10-23', '2026-10-23'], ['2026-07-12T09:00:00+09:00', '2026-07-12T00:00:00.000Z']]) {
    const record = sitemapArticleMetadata(`---\npubDate: ${source}\n---\nBody`, 'health', 'guide.md');
    assert.equal(record.lastmod, expected);
  }
});
