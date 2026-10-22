import { readFileSync, writeFileSync } from 'node:fs';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

const options = { ignoreAttributes: false, parseTagValue: false, trimValues: false };
const asArray = value => value === undefined ? [] : Array.isArray(value) ? value : [value];

export function preserveSitemapDates(xml, dates) {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Invalid sitemap XML: ${valid.err.msg}`);
  const document = new XMLParser(options).parse(xml);
  if (document.urlset) {
    for (const entry of asArray(document.urlset.url)) {
      const path = new URL(entry.loc).pathname;
      const date = dates.get(path) ?? dates.get(decodeURI(path));
      if (date) entry.lastmod = date;
      else if (entry.lastmod) throw new Error(`Unexpected sitemap lastmod: ${entry.loc}`);
    }
  } else if (document.sitemapindex) {
    // A page date is not the modification time of the sitemap file itself.
    for (const entry of asArray(document.sitemapindex.sitemap)) delete entry.lastmod;
  } else {
    throw new Error('Expected a sitemap URL set or index');
  }
  return new XMLBuilder(options).build(document);
}

// @astrojs/sitemap currently expands every lastmod to UTC midnight. Restore source precision.
export function sitemapDatePrecision(dates) {
  return {
    name: 'healthpick-sitemap-date-precision',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const indexUrl = new URL('sitemap-index.xml', dir);
        const index = readFileSync(indexUrl, 'utf8');
        const document = new XMLParser(options).parse(index);
        const entries = asArray(document.sitemapindex?.sitemap);
        if (!entries.length) throw new Error('No generated sitemaps found');
        for (const entry of entries) {
          const name = new URL(entry.loc).pathname.split('/').at(-1);
          if (!/^sitemap-\d+\.xml$/.test(name)) throw new Error(`Unexpected sitemap file: ${name}`);
          const file = new URL(name, dir);
          writeFileSync(file, preserveSitemapDates(readFileSync(file, 'utf8'), dates));
        }
        writeFileSync(indexUrl, preserveSitemapDates(index, dates));
      },
    },
  };
}
