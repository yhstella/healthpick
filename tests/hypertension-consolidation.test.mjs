import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';

const root = new URL('../', import.meta.url);
const retained = '혈압-140-95-약-운동';
const retired = '혈압-145-90-운동만으로-떨어질까';
const lifestyle = '고혈압-예방-약-없이-먼저-손볼-7가지';
const article = (id) => matter(readFileSync(new URL(`src/content/articles/health/${id}.md`, root), 'utf8'));

test('revised hypertension articles preserve publication dates without inventing medical review', () => {
  for (const [id, date] of [[retained, '2026-05-21T00:00:00.000Z'], [lifestyle, '2026-05-19T23:59:00.000Z']]) {
    const { data } = article(id);
    assert.equal(new Date(data.pubDate).toISOString(), date);
    assert.equal(new Date(data.updatedDate).toISOString().slice(0, 10), '2026-10-23');
    assert.equal(data.draft, false);
    assert.equal(data.manual, true);
    assert.equal(data.medical, true);
    assert.equal(data.medicalReview, undefined);
    assert.equal((data.faqs ?? []).length, 0);
  }
});

test('merged article remains archived and its page, raw and image aliases redirect permanently', () => {
  const { data } = article(retired);
  assert.equal(data.draft, true);
  assert.equal(new Date(data.pubDate).toISOString(), '2026-05-21T07:10:00.000Z');
  const { redirects } = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'));
  for (const [prefix, suffix] of [['/health/', '/'], ['/raw/health/', '.md'], ['/og/', '.png']]) {
    const matches = redirects.filter((item) => item.source === `${prefix}${retired}${suffix}`);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].destination, `${prefix}${retained}${suffix}`);
    assert.equal(matches[0].permanent, true);
  }
  for (const tag of data.tags) assert(article(retained).data.tags.includes(tag));
});

test('revised source lists point to documents cited in the body, not institution homepages', () => {
  for (const id of [retained, lifestyle]) {
    const { data, content } = article(id);
    assert(data.sources.length >= 6);
    for (const source of data.sources) {
      assert.notEqual(new URL(source.url).pathname, '/');
      assert(content.includes(`](${source.url})`), `${id}: source absent from body: ${source.url}`);
    }
  }
});

test('decision guide keeps the diastolic boundary and risk-based treatment conditions explicit', () => {
  const { content } = article(retained);
  assert(content.includes('수축기 135 이상 **또는** 이완기 85 이상'));
  assert(content.includes('**이완기 85는 기준에 해당**'));
  assert(content.includes('Class IIb'));
  assert(content.includes('누구나 3~6개월을 기다려도 되는 것은 아닙니다'));
  assert(content.includes('혈압 숫자와 관계없이 119'));
  assert(content.includes('수축기 180 이상 **또는** 이완기 110 이상'));
});

test('lifestyle guide does not frame medicine as optional support', () => {
  const { data, content } = article(lifestyle);
  assert.equal(data.title, '혈압 관리를 돕는 생활습관 7가지');
  assert.equal(data.featured, true);
  assert(!content.includes('약은 이 위에 얹는 보조'));
  assert(content.includes('임의로 미루거나 끊지 말고'));
  assert(content.includes(`/health/${retained}/`));
  assert(article(retained).content.includes(`/health/${lifestyle}/`));
});
