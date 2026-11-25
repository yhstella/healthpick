import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';
import { parse } from 'parse5';
import config from '../astro.config.mjs';
import { articleFrontmatter } from '../scripts/lib/article-frontmatter.mjs';
import { normalizeArticleDate } from '../src/lib/article-dates.mjs';

const root = new URL('../', import.meta.url);
const cooling = '에어컨-방에서-잔-뒤-마른기침-2주째-병원-가야-하나';
const cough = '여름감기-3주째-마른기침-안-멎는데-폐렴-검사해야-하나';
const throat = '인두염-증상-이런-변화는-주의';
const ids = [cooling, cough, throat];
const source = id => readFileSync(new URL(`src/content/articles/health/${id}.md`, root), 'utf8');
const article = id => matter(source(id));

test('respiratory revisions preserve publication precision and do not invent medical review', () => {
  const dates = [[cooling, '2026-07-02'], [cough, '2026-07-18'], [throat, '2026-05-16T21:07:34.000Z']];
  for (const [id, date] of dates) {
    const data = articleFrontmatter(source(id));
    assert.equal(normalizeArticleDate(data.pubDate), date);
    assert.equal(data.updatedDate, '2026-10-23');
    assert.equal(data.draft, false);
    assert.equal(data.manual, true);
    assert.equal(data.medical, true);
    assert.equal(data.medicalReview, undefined);
    assert.equal(data.author, '헬스픽 편집부');
    assert.deepEqual(data.faqs, []);
  }
});

test('respiratory sources are direct documents also cited in the body', () => {
  for (const id of ids) {
    const { data, content } = article(id);
    assert(data.sources.length >= 3, id);
    for (const entry of data.sources) {
      const url = new URL(entry.url);
      assert.equal(url.protocol, 'https:');
      assert.notEqual(url.pathname, '/');
      assert(content.includes(`](${entry.url})`), `${id}: ${entry.url}`);
    }
  }
});

test('cooling guide does not diagnose by exposure or add a two-week home-management wait', () => {
  const { data, content } = article(cooling);
  assert(content.includes('에어컨을 끄고 좋아졌다는 반응만으로 원인을 확정하지 마세요'));
  assert(content.includes('실내 관리를 추가로 2주 끝낼 때까지 기다리지 마세요'));
  assert(content.includes('체중이 줄거나 밤에 땀이 나는 증상까지 모두 생겨야'));
  assert(content.includes('곰팡이 예방을 위한 안내이지'));
  assert(content.includes('제품 설명서'));
  assert(content.includes('이 성인 안내의 기간을 그대로 적용하지 말고'));
  assert(!`${data.description}\n${content}`.includes('원인일 가능성이 큽니다'));
  assert(!content.includes('26~28도'));
  assert(!content.includes('4~6시간'));
});

test('postinfection guide keeps duration, sputum color and imaging from becoming diagnostic shortcuts', () => {
  const { content } = article(cough);
  assert(content.includes('기간만으로 이 진단이 확정되는 것은 아닙니다'));
  assert(content.includes('가래에 색이 있다는 사실만으로 세균 감염을 뜻하지 않는다'));
  assert(content.includes('반대로 색이 옅다고 세균 감염이 없다고 할 수도 없습니다'));
  assert(content.includes('정상 X선 뒤 모두 CT로 이어지는 것도 아닙니다'));
  assert(content.includes('이 검사를 모두 같은 순서로 받는 것은 아닙니다'));
  assert(content.includes('경고 증상이 모두 함께 나타나거나'));
  assert(!content.includes('감염 후 기침은 대부분'));
  assert(!content.includes('내성만 키울'));
  assert(!content.includes('검진은 무료'));
  assert(!content.includes('대부분 건강보험'));
});

test('throat guide preserves urgent swallowing and airway care without equating stridor with wheeze', () => {
  const { content } = article(throat);
  assert(content.includes('침을 삼키지 못해 흘리는 경우'));
  assert(content.includes('숨을 들이쉴 때 높고 거친 소리'));
  assert(content.includes('이런 증상이 있으면 119에 연락해 즉시 도움'));
  assert(content.includes('억지로 눕히지 말고'));
  assert(content.includes('통증이 있다는 것과 침도 삼키지 못하는 상태는 구분'));
  assert(!content.includes('들이쉴 때 쌕쌕'));
});

test('throat testing guidance keeps clinical context and age-specific negative-test follow-up explicit', () => {
  const { content } = article(throat);
  assert(content.includes('뚜렷한 바이러스 증상이 있으면'));
  assert(content.includes('증상이 있는 3세 이상 소아'));
  assert(content.includes('성인 등 다른 연령에서는 일률적인 추가 배양검사를 권하지 않습니다'));
  assert(content.includes('미국 안내의 일반 원칙'));
  assert(content.includes('검사 연락을 기다리지 말고'));
  assert(content.includes('소아의 비율을 모든 성인에게 같은 수치로 적용할 수는 없습니다'));
  assert(content.includes('일주일은 반드시 기다려야 하는 기간이 아닙니다'));
  assert(!content.includes('인두염의 약 15~30%'));
});

test('respiratory revisions retain all existing tags and only link to published internal articles', () => {
  assert.deepEqual(article(cooling).data.tags, ['마른기침', '냉방병', '에어컨', '알레르기', '이비인후과']);
  assert.deepEqual(article(cough).data.tags, ['여름감기', '마른기침', '폐렴검사', '감염후기침', '호흡기내과']);
  assert.deepEqual(article(throat).data.tags, ['증상', '진단', '인두염']);
  for (const id of ids) for (const [, target] of article(id).content.matchAll(/\]\(\/health\/([^/)]+)\/\)/g)) {
    const file = new URL(`src/content/articles/health/${decodeURIComponent(target)}.md`, root);
    assert(existsSync(file), `${id}: ${target}`);
    assert.notEqual(articleFrontmatter(readFileSync(file, 'utf8')).draft, true, target);
  }
});

test('respiratory Markdown renders emphasis and has usable unique heading anchors', async () => {
  const renderer = await config.markdown.processor.createRenderer({ syntaxHighlight: false });
  const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
  for (const id of ids) {
    const result = await renderer.render(article(id).content);
    assert(!text(parse(result.code)).includes('**'), id);
    assert(result.metadata.headings.length > 0, id);
    assert.equal(new Set(result.metadata.headings.map(item => item.slug)).size, result.metadata.headings.length, id);
  }
});
