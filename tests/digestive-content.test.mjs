import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';
import { parse } from 'parse5';
import config from '../astro.config.mjs';

const root = new URL('../', import.meta.url);
const iron = '철분제-2주-먹은-뒤-변이-까맣게-나오는데-정상인가';
const pain = '명치-통증-4일째-소화제-안-듣는데-위내시경-해야-하나';
const gastritis = '위염-만성-약-안먹어도-되나요';
const diet = '소화불량-자가-관리에-좋은-음식과-식단';
const cure = '헬리코박터-제균-치료-후-확인검사';
const ids = [iron, pain, gastritis, diet, cure];
const article = id => matter(readFileSync(new URL(`src/content/articles/health/${id}.md`, root), 'utf8'));

test('digestive revisions preserve original publication times and do not invent medical review', () => {
  const dates = [[iron, '2026-07-15T00:00:00.000Z'], [pain, '2026-07-11T00:00:00.000Z'], [gastritis, '2026-05-22T08:00:00.000Z'], [diet, '2026-05-02T01:52:35.000Z']];
  for (const [id, date] of dates) {
    const { data } = article(id);
    assert.equal(new Date(data.pubDate).toISOString(), date);
    assert.equal(new Date(data.updatedDate).toISOString(), '2026-10-23T00:00:00.000Z');
  }
  for (const id of ids) {
    const { data } = article(id);
    assert.equal(data.draft, false);
    assert.equal(data.manual, true);
    assert.equal(data.medical, true);
    assert.equal(data.author, '헬스픽 편집부');
    assert.equal(data.medicalReview, undefined);
    assert.deepEqual(data.faqs, []);
  }
  assert.equal(new Date(article(cure).data.pubDate).toISOString(), '2026-10-23T00:00:00.000Z');
});

test('digestive sources identify direct documents cited in their article bodies', () => {
  for (const id of ids) {
    const { data, content } = article(id);
    assert(data.sources.length >= 3);
    for (const source of data.sources) {
      assert.notEqual(new URL(source.url).pathname, '/');
      assert(content.includes(`](${source.url})`), `${id}: ${source.url}`);
    }
  }
});

test('iron guide rejects appearance-based clearance and stopping iron as a bleeding test', () => {
  const { content } = article(iron);
  assert(content.includes('출혈도 함께 있을 수 있고'));
  assert(content.includes('집에서 출혈을 배제하는 검사가 아닙니다'));
  assert(content.includes('철분제를 며칠 중단한 뒤 기다리지 마세요'));
  assert(content.includes('검진용 대변잠혈검사를 먼저 해 본 뒤'));
  assert(content.includes('즉시 진료받으세요'));
  assert(!content.includes('물에 닿았을 때 번지는 색을 봅니다'));
  assert(!content.includes('2~3일 멈추고'));
  assert(!content.includes('gFOBT'));
  assert(!content.includes('산화마그네슘'));
});

test('epigastric pain guide does not require a minimum wait or a diagnostic response to stomach medicine', () => {
  const { content } = article(pain);
  assert(content.includes('기간이나 약 반응으로 진단할 수는 없습니다'));
  assert(content.includes('30분이 지나거나 특정 증상이 모두 나타날 때까지 기다리지 마세요'));
  assert(content.includes('직접 운전하지 마세요'));
  assert(content.includes('위내시경이 항상 첫 검사는 아닙니다'));
  assert(content.includes('처방 기간이 끝날 때까지 기다리지 마세요'));
  assert(!content.includes('40세 미만'));
  assert(!content.includes('하루 이틀 안에'));
  assert(!content.includes('2~4주 시험'));
});

test('gastritis guide separates pathology, symptoms, treatment purpose and individualized surveillance', () => {
  const { content } = article(gastritis);
  assert(content.includes('내시경에서 보인 모습과 현미경으로 확인한 조직 결과는 같은 정보가 아닙니다'));
  assert(content.includes('발견되면 모두 암으로 진행한다는 뜻은 아닙니다'));
  assert(content.includes('국가검진 일정이 있다는 이유만으로 개별 추적 계획을 대신하지 않고'));
  assert(content.includes('출혈 예방이나 다른 질환 치료 때문에'));
  assert(content.includes('임의 중단하지 마세요'));
  assert(!content.includes('2년마다'));
  assert(!content.includes('권고를 보류한'));
});

test('dyspepsia diet does not diagnose by food response or promise universally safe foods', () => {
  const { content } = article(diet);
  assert(content.includes('식단을 바꿔 조금 나아졌다고 이 진단이 확정되는 것도 아닙니다'));
  assert(content.includes('여러 식품군을 한꺼번에 끊지는 마세요'));
  assert(content.includes('잡곡밥·요거트·특정 차도 모든 사람에게'));
  assert(content.includes('생활관리를 몇 주 끝내야 상담할 수 있는 것은 아닙니다'));
  assert(!content.includes('고령(대개 40대 중반 이후)'));
});

test('new eradication follow-up explains test type and timing without directing unsupervised medication withdrawal', () => {
  const { content } = article(cure);
  assert(content.includes('혈액 항체검사로 현재 감염과 과거 감염을 구분하기 어렵다'));
  assert(content.includes('대변잠혈검사와 목적이 다릅니다'));
  assert(content.includes('끝낸 뒤 최소 4주'));
  assert(content.includes('검사 전 최소 2주'));
  assert(content.includes('약을 지금부터 스스로 끊으라는 지시가 아닙니다'));
  assert(content.includes('중단·재시작 날짜를 처방의와 검사기관이 함께 정해야'));
  assert(content.includes('다른 모든 위장 질환까지 없다는 뜻'));
  assert(content.includes('검사 예약일까지 기다릴 이유가 되지 않습니다'));
});

test('digestive internal links resolve to retained source URLs including the new follow-up guide', () => {
  for (const id of ids) {
    for (const [, target] of article(id).content.matchAll(/\]\(\/health\/([^/)]+)\/\)/g)) {
      assert(existsSync(new URL(`src/content/articles/health/${decodeURIComponent(target)}.md`, root)), `${id}: ${target}`);
    }
  }
  assert(article(gastritis).content.includes(`/health/${cure}/`));
  assert(article(cure).content.includes(`/health/${gastritis}/`));
});

test('digestive Markdown renders emphasis instead of exposing literal formatting markers', async () => {
  const renderer = await config.markdown.processor.createRenderer({ syntaxHighlight: false });
  const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
  for (const id of ids) {
    const result = await renderer.render(article(id).content);
    assert(!text(parse(result.code)).includes('**'), id);
  }
});
