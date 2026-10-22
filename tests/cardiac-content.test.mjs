import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';

const root = new URL('../', import.meta.url);
const article = id => matter(readFileSync(new URL(`src/content/articles/health/${id}.md`, root), 'utf8'));
const rate = '30대-안정시-맥박-95-운동-부족인가-다른-원인인가';
const caffeine = '카페인-끊었는데-두근거림-2주째-병원-가야-하나';
const watch = '갤럭시워치-심방세동-알림-떴는데-병원-진짜-가야-하나';
const coronary = '관상동맥-질환-예방-식단-운동-검진까지';
const retired = '휴식-심박수-95-bpm-카페인-하루-3잔-빈맥-진료-기준';
const revised = [rate, caffeine, watch, coronary];

test('cardiac revisions preserve publication history without inventing medical review', () => {
  for (const [id, date] of [[rate, '2026-05-21T00:00:00.000Z'], [caffeine, '2026-07-01T00:00:00.000Z'], [watch, '2026-05-21T00:00:00.000Z'], [coronary, '2026-05-09T11:47:16.000Z']]) {
    const { data } = article(id);
    assert.equal(new Date(data.pubDate).toISOString(), date);
    assert.equal(new Date(data.updatedDate).toISOString().slice(0, 10), '2026-10-23');
    assert.equal(data.author, '헬스픽 편집부');
    assert.equal(data.manual, true);
    assert.equal(data.medical, true);
    assert.equal(data.draft, false);
    assert.equal(data.medicalReview, undefined);
    assert.equal((data.faqs ?? []).length, 0);
  }
});

test('duplicate resting-rate guide is archived with tags and encoded aliases preserved', () => {
  const { data } = article(retired);
  assert.equal(data.draft, true);
  assert.equal(new Date(data.pubDate).toISOString().slice(0, 10), '2026-05-28');
  for (const tag of data.tags) assert(article(rate).data.tags.includes(tag));
  const redirects = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8')).redirects;
  for (const [prefix, suffix] of [['/health/', '/'], ['/raw/health/', '.md'], ['/og/', '.png']]) {
    const matches = redirects.filter(item => item.source === encodeURI(`${prefix}${retired}${suffix}`));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].destination, encodeURI(`${prefix}${rate}${suffix}`));
    assert.equal(matches[0].permanent, true);
  }
});

test('cardiac revisions cite direct documents in their bodies and do not link to the archived guide', () => {
  for (const id of revised) {
    const { data, content } = article(id);
    assert(data.sources.length >= 3);
    for (const source of data.sources) {
      assert.notEqual(new URL(source.url).pathname, '/');
      assert(content.includes(`](${source.url})`), `${id}: ${source.url}`);
    }
    assert(!content.includes(`/health/${retired}/`));
  }
});

test('resting-rate guide does not turn a normal range or caffeine amount into a safety guarantee', () => {
  const { content } = article(rate);
  assert(content.includes('분당 60~100회'));
  assert(content.includes('진단을 대신하는'));
  assert(content.includes('400mg은 두근거림이 있는 사람이 채워도 되는 목표량이나 개인별 안전선이 아닙니다'));
  assert(content.includes('정해진 2주나 두 달 동안 생활관리를 먼저 끝낼 필요는 없습니다'));
  assert(content.includes('맥박이 분당 100회를 넘는지 더 재거나'));
  assert(!content.includes('3일 평균'));
});

test('recurrent palpitations do not require completing a withdrawal period or a multiweek diary', () => {
  const { content } = article(caffeine);
  assert(content.includes('지금 두근거림이 가라앉지 않거나'));
  assert(content.includes('2주가 되는 날이 진료를 시작하는 기준은 아닙니다'));
  assert(content.includes('2~3주 분량을 완성할 때까지 진료를 미루지 마세요'));
  assert(content.includes('모든 사람이 24시간 홀터 검사를 반드시 받아야 한다는 뜻은 아닙니다'));
  assert(!content.includes('길어도 9일'));
});

test('watch guide distinguishes automatic alerts, ECG records, symptoms and clinician decisions', () => {
  const { content } = article(watch);
  assert(content.includes('불규칙 심장 리듬 알림(IHRN)'));
  assert(content.includes('단일 유도에 해당하는 심장 전기 신호 기록'));
  assert(content.includes('심장마비를 찾아내는 기능도 아닙니다'));
  assert(content.includes('알림이 두 번 뜨는지 기다릴 필요는 없습니다'));
  assert(content.includes('진단과 개인별 위험 평가'));
  assert(!content.includes('1~2주 이내'));
  assert(!content.includes('무증상으로 발견된 잠재 심방세동의 위험은'));
});

test('coronary prevention keeps emergency symptoms independent of a minimum duration', () => {
  const { data, content } = article(coronary);
  assert(data.tldr[1].includes('정해진 시간을 채우려고 기다리지 마세요'));
  assert(content.includes('즉시 119에 연락하고 직접 운전하지 마세요'));
  assert(content.includes('좋아졌다는 사실만으로 안전하다고 판단하거나'));
  assert(content.includes('생활관리가 좋아져도 처방약은 임의로 바꾸지 마세요'));
  assert(!content.includes('20~30분'));
  assert(!content.includes('하루 1~2잔'));
});
