import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';
import { slug } from 'github-slugger';

const root = new URL('../src/content/articles/health/', import.meta.url);
const article = id => matter(readFileSync(new URL(`${id}.md`, root), 'utf8'));
const swimming = '바다-수영-후-귀-먹먹함-3일째-안-빠지는데-병원-가야-하나';
const tinnitus = '한쪽-귀-이명-2주-청력-저하-50대-뇌MRI-시점-기준';
const eyelid = '눈꺼풀-떨림-2주째-마그네슘-먹어도-안-멎는데-병원-가야-하나';
const lens = '콘택트렌즈-충혈-통증-각막염-진료';
const all = [swimming, tinnitus, eyelid, lens];

test('eye and ear revisions retain original publication dates without invented medical review', () => {
  for (const [id, date] of [[swimming, '2026-07-22'], [tinnitus, '2026-06-07'], [eyelid, '2026-07-07']]) {
    const { data } = article(id);
    assert.equal(new Date(data.pubDate).toISOString().slice(0, 10), date);
    assert.equal(new Date(data.updatedDate).toISOString().slice(0, 10), '2026-10-23');
  }
  const newPage = article(lens).data;
  assert.equal(new Date(newPage.pubDate).toISOString().slice(0, 10), '2026-10-23');
  assert.equal(newPage.updatedDate, undefined);
  for (const id of all) {
    const { data } = article(id);
    assert.equal(data.author, '헬스픽 편집부');
    assert.equal(data.manual, true);
    assert.equal(data.medical, true);
    assert.equal(data.draft, false);
    assert.equal(data.medicalReview, undefined);
    assert.equal((data.faqs ?? []).length, 0);
  }
});

test('eye and ear sources name direct documents linked from their article bodies', () => {
  for (const id of all) {
    const { data, content } = article(id);
    assert(data.sources.length >= 3);
    assert.equal(new Set(data.sources.map(source => source.url)).size, data.sources.length);
    for (const source of data.sources) {
      assert.notEqual(new URL(source.url).pathname, '/');
      assert(content.includes(`](${source.url})`), `${id}: ${source.url}`);
    }
  }
});

test('swimming guide does not use pain absence or a three-day wait to rule out urgent hearing loss', () => {
  const { data, content } = article(swimming);
  assert(data.tldr[0].includes('통증이 없어도 당일'));
  assert(content.includes('집에서 원인을 확정하는 검사가 아닙니다'));
  assert(content.includes('열이나 심한 통증이 생길 때까지 기다리지 말고'));
  assert(content.includes('119에 연락하세요'));
  assert(!content.includes('가볍게 통통 뛰기'));
  assert(!content.includes('대부분은 시간이 지나며 저절로 좋아집니다'));
  assert(content.includes(`/health/${slug(tinnitus)}/`));
});

test('tinnitus guide keeps urgent hearing care separate from individualized MRI decisions', () => {
  const { data, content } = article(tinnitus);
  assert(data.tldr[0].includes('당일 이비인후과 평가'));
  assert(content.includes('MRI 결과를 기다리느라 필요한 진료나 치료를 미루지 마세요'));
  assert(content.includes('청력검사가 정상이라고 MRI가 항상 불필요한 것은 아닙니다'));
  assert(content.includes('조영증강 검사를 무조건 요구할 필요는 없습니다'));
  assert(content.includes('영국 지침의 평가 방향'));
  assert(content.includes('119에 연락하고 직접 운전하지 마세요'));
  assert(content.includes(`/health/${swimming}/`));
});

test('eyelid guide avoids sleep-based reassurance and supplement escalation while distinguishing emergencies', () => {
  const { data, content } = article(eyelid);
  assert(data.tldr[0].includes('2주 넘게 계속되면 진료를 예약'));
  assert(content.includes('눈꺼풀 떨림만으로 마그네슘 결핍을 진단할 수는 없습니다'));
  assert(content.includes('용량을 계속 늘리거나 여러 보충제를 겹쳐 먹지 마세요'));
  assert(content.includes('머리를 다친 뒤 생긴 복시 | 즉시 응급실 평가'));
  assert(content.includes('말이 어눌해짐 | 119에 연락'));
  assert(!content.includes('혈중 마그네슘 수치를 비교한 연구들'));
  assert(!content.includes('하루 400mg'));
  assert(content.includes(`/health/${lens}/`));
});

test('new contact lens guide gives immediate actions and does not permit symptom-based reuse', () => {
  const { data, content } = article(lens);
  assert(data.tldr[0].includes('렌즈를 빼고 바로 안과에 연락'));
  assert(content.includes('즉시 진료 가능한 안과나 응급실'));
  assert(content.includes('조금 편해졌다고 감염이 없다고 판단할 수는 없습니다'));
  assert(content.includes('사용하던 렌즈를 버리지 말고 케이스에 담아'));
  assert(content.includes('수돗물·생수·직접 만든 소금물로 씻거나 보관하기'));
  assert(content.includes('착용 재개일로 스스로 정하지 마세요'));
});
