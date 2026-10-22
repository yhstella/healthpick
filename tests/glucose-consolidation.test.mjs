import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';

const root = new URL('../', import.meta.url);
const article = id => matter(readFileSync(new URL(`src/content/articles/health/${id}.md`, root), 'utf8'));
const retained = '공복혈당-110-당뇨-전단계';
const postmeal = '식후혈당-220-공복-95-가족력-40대-약-시작-기준';
const diet = '당뇨-식단의-진짜-핵심';
const a1c = '당화혈색소-6-1-당뇨-진단-기준';
const retired = ['공복혈당-105-당뇨전단계-식이운동', '공복혈당-105-당뇨전단계-체중-5kg-감량'];
const old118 = '공복혈당-118에-당화혈색소-5-9-당뇨-전-단계-판정-경계';
const redirects = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8')).redirects;

test('glucose revisions preserve publication history and do not claim medical review', () => {
  for (const [id, date] of [[retained, '2026-05-21T00:00:00.000Z'], [postmeal, '2026-06-01T00:00:00.000Z'], [diet, '2026-05-19T23:52:00.000Z'], [a1c, '2026-10-16T00:00:00.000Z']]) {
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

test('both 105 guides are archived with their dates, tags and encoded permanent aliases preserved', () => {
  for (const [index, id] of retired.entries()) {
    const { data } = article(id);
    assert.equal(data.draft, true);
    assert.equal(new Date(data.pubDate).toISOString(), ['2026-05-23T08:00:00.000Z', '2026-05-26T00:00:00.000Z'][index]);
    for (const tag of data.tags) assert(article(retained).data.tags.includes(tag));
    for (const [prefix, suffix] of [['/health/', '/'], ['/raw/health/', '.md'], ['/og/', '.png']]) {
      const matches = redirects.filter(item => item.source === encodeURI(`${prefix}${id}${suffix}`));
      assert.equal(matches.length, 1);
      assert.equal(matches[0].destination, encodeURI(`${prefix}${retained}${suffix}`));
      assert.equal(matches[0].permanent, true);
    }
  }
});

test('the obsolete 118 page and its English alias point directly to the matching consolidated guide', () => {
  for (const source of [encodeURI(`/health/${old118}/`), '/health/fasting-glucose-118-a1c-5-9-prediabetes/']) {
    const matches = redirects.filter(item => item.source === source);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].destination, encodeURI(`/health/${retained}/`));
    assert.equal(matches[0].permanent, true);
  }
});

test('glucose source metadata names direct documents linked from the revised bodies', () => {
  for (const id of [retained, postmeal, diet, a1c]) {
    const { data, content } = article(id);
    assert.equal(data.sources.length, 4);
    for (const source of data.sources) {
      assert.notEqual(new URL(source.url).pathname, '/');
      assert(content.includes(`](${source.url})`), `${id}: ${source.url}`);
    }
    for (const id of retired) assert(!content.includes(`/health/${id}/`));
  }
});

test('postmeal guide distinguishes ordinary home measurements from diagnostic glucose-load testing', () => {
  const { data, content } = article(postmeal);
  assert(data.tldr[0].includes('동일하게 해석하면 안 됩니다'));
  assert(content.includes('**75g 경구당부하검사 2시간 후 혈장포도당 200mg/dL 이상**'));
  assert(content.includes('무작위 혈장포도당 200 이상과 전형적 증상'));
  assert(content.includes('집에서 식후 혈당을 반복해서 재는 것만으로 이 확인 절차를 대신할 수는 없습니다'));
  assert(content.includes('특정 혈당 숫자에 도달할 때까지 기다리지 마세요'));
});

test('nutrition and prevention guides retain individual treatment conditions instead of fixed universal targets', () => {
  const prevention = article(retained).content;
  const nutrition = article(diet).content;
  assert(prevention.includes('감량은 과체중이나 비만인 사람에게 필요한 계획'));
  assert(prevention.includes('제한적 권고'));
  assert(prevention.includes('6개월 뒤에만 다시 보면 된다'));
  assert(!nutrition.includes('55~65%'));
  assert(nutrition.includes('고정 영양소 비율은 없다고'));
  assert(nutrition.includes('저혈당 위험'));
  assert(nutrition.includes('SGLT2억제제'));
  assert(article(a1c).content.includes('전단계 성인에서 예방을 위한 메트포민 사용을 고려'));
});
