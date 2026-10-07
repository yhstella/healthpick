import assert from 'node:assert/strict';
import test from 'node:test';
import { currentMedicalReview, medicalContentHash } from '../src/lib/medical-review.ts';

const content = {
  medical: true,
  title: 'Test article',
  description: 'Test description',
  tldr: ['Summary'],
  faqs: [{ q: 'Question', a: 'Answer' }],
  sources: [{ name: 'Source', url: 'https://example.org/source' }],
};
const body = '## Heading\n\nBody text.\n';
const reviewed = {
  ...content,
  medicalReview: {
    reviewer: 'sung-juhyun',
    reviewedAt: new Date('2026-10-06'),
    contentHash: medicalContentHash(content, body),
  },
};

test('medical content without a record is not reviewed', () => {
  assert.equal(currentMedicalReview(content, body), null);
});

test('matching content retains its actual review date', () => {
  const result = currentMedicalReview({
    ...reviewed,
    pubDate: new Date('2026-10-07'),
    updatedDate: new Date('2026-10-08'),
  }, body);
  assert.equal(result.reviewedAt.toISOString().slice(0, 10), '2026-10-06');
});

test('body and claim-bearing metadata changes invalidate the record', () => {
  assert.equal(currentMedicalReview(reviewed, body + 'New claim.'), null);
  for (const field of ['title', 'description', 'tldr', 'faqs', 'sources']) {
    const changed = structuredClone(reviewed);
    if (typeof changed[field] === 'string') changed[field] += ' Changed';
    else changed[field] = [];
    assert.equal(currentMedicalReview(changed, body), null, field);
  }
});

test('line endings do not invalidate a record', () => {
  assert.ok(currentMedicalReview(reviewed, body.replace(/\n/g, '\r\n')));
});

test('non-medical content does not claim medical review', () => {
  assert.equal(currentMedicalReview({ ...reviewed, medical: false }, body), null);
});
