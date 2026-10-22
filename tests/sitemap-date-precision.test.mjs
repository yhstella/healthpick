import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { preserveSitemapDates, sitemapDatePrecision } from '../scripts/lib/sitemap-date-precision.mjs';

const dates = new Map([['/health/day/', '2026-10-23'], ['/health/instant/', '2026-07-12T00:00:00.000Z']]);
const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://healthpick.kr/health/day/</loc><lastmod>2026-10-23T00:00:00.000Z</lastmod><priority>0.7</priority><image:image><image:loc>https://healthpick.kr/og/day.png</image:loc></image:image></url><url><loc>https://healthpick.kr/health/instant/</loc><lastmod>2026-07-12T00:00:00.000Z</lastmod></url><url><loc>https://healthpick.kr/about/</loc></url></urlset>';

test('serialized sitemap preserves mixed precision, namespaces, URLs and image data', () => {
  const result = preserveSitemapDates(xml, dates);
  assert.equal(XMLValidator.validate(result), true);
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  const before = parser.parse(xml);
  const after = parser.parse(result);
  before.urlset.url[0].lastmod = '2026-10-23';
  assert.deepEqual(after, before);
  assert.equal(preserveSitemapDates(result, dates), result);
});

test('sitemap index does not mislabel article dates as file modification times', () => {
  const result = preserveSitemapDates('<sitemapindex><sitemap><loc>https://healthpick.kr/sitemap-0.xml</loc><lastmod>2026-10-23T00:00:00.000Z</lastmod></sitemap></sitemapindex>', dates);
  assert.equal(new XMLParser().parse(result).sitemapindex.sitemap.lastmod, undefined);
  assert(result.includes('https://healthpick.kr/sitemap-0.xml'));
});

test('invalid XML and untracked sitemap dates fail explicitly', () => {
  assert.throws(() => preserveSitemapDates('<urlset>', dates), /Invalid sitemap XML/);
  assert.throws(() => preserveSitemapDates('<other/>', dates), /Expected a sitemap/);
  assert.throws(() => preserveSitemapDates(xml, new Map()), /Unexpected sitemap lastmod/);
});

test('build integration handles generated child files, and rejects unexpected file paths', t => {
  const directory = mkdtempSync(join(tmpdir(), 'healthpick-sitemap-dates-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const index = join(directory, 'sitemap-index.xml');
  const child = join(directory, 'sitemap-0.xml');
  writeFileSync(index, '<sitemapindex><sitemap><loc>https://healthpick.kr/sitemap-0.xml</loc></sitemap></sitemapindex>');
  writeFileSync(child, xml);
  const hook = sitemapDatePrecision(dates).hooks['astro:build:done'];
  hook({ dir: pathToFileURL(`${directory}/`) });
  assert(readFileSync(child, 'utf8').includes('<lastmod>2026-10-23</lastmod>'));
  writeFileSync(index, '<sitemapindex><sitemap><loc>https://healthpick.kr/unexpected.xml</loc></sitemap></sitemapindex>');
  assert.throws(() => hook({ dir: pathToFileURL(`${directory}/`) }), /Unexpected sitemap file/);
});
