import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDraftResponse } from '../scripts/lib/draft-validation.mjs';

const article = `---
title: A specific health question
description: A complete description of this health information draft.
category: health
pubDate: 2026-10-23
medical: true
draft: true
manual: false
sources:
  - name: Official guide
    url: https://example.org/guide
---
## Answer

Read the [official guide](https://example.org/guide).
`;
const response = (result = article) => ({ type: 'result', subtype: 'success', is_error: false, result });

test('accepts an unpublished draft, not a publication approval', () => {
  assert.equal(validateDraftResponse(response()), article);
});

test('rejects provider errors even when partial article text exists', () => {
  assert.throws(() => validateDraftResponse({ ...response(), subtype: 'error_max_budget_usd', is_error: true }));
});

test('rejects publishable metadata or generated medical review', () => {
  assert.throws(() => validateDraftResponse(response(article.replace('draft: true', 'draft: false'))));
  assert.throws(() => validateDraftResponse(response(article.replace('category: health', 'category: finance'))));
  assert.throws(() => validateDraftResponse(response(article.replace('manual: false', 'manual: true'))));
  assert.throws(() => validateDraftResponse(response(article.replace('medical: true', 'medical: true\nmedicalReview: {}'))));
});

test('rejects missing, root-only and uncited sources', () => {
  assert.throws(() => validateDraftResponse(response(article.replaceAll('https://example.org/guide', 'https://example.org/'))));
  assert.throws(() => validateDraftResponse(response(article.replace('[official guide](https://example.org/guide)', 'uncited text'))));
});
