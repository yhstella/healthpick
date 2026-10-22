import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rawHeaderRoutes, rawStaticHeaders } from '../scripts/lib/raw-static-headers.mjs';

test('raw static headers match encoded Korean paths exactly and preserve noindex and canonical', () => {
  const path = '/raw/health/\uac74\uac15-6-1.md';
  const headers = new Headers({
    'content-type': 'text/markdown; charset=utf-8',
    'cache-control': 'public, max-age=86400',
    'x-robots-tag': 'noindex, follow',
    link: `<https://healthpick.kr${encodeURI('/health/\uac74\uac15-6-1/')}>; rel="canonical"`,
    'set-cookie': 'must-not-be-published=1',
  });
  const routes = rawHeaderRoutes(new Map([
    [path, { headers }],
    ['/health/guide/', { headers }],
    ['/raw/health/guide.md/extra', { headers }],
  ]));
  assert.equal(routes.length, 1);
  const rule = routes[0];
  const pattern = new RegExp(rule.src);
  assert(pattern.test(encodeURI(path)));
  assert(!pattern.test(`${encodeURI(path)}/extra`));
  assert(!pattern.test(encodeURI(path).replace('.md', 'xmd')));
  assert(/^[\x00-\x7f]+$/.test(rule.src));
  assert.equal(rule.continue, true);
  assert.equal(rule.headers['x-robots-tag'], 'noindex, follow');
  assert.equal(rule.headers.link, headers.get('link'));
  assert.equal(rule.headers['set-cookie'], undefined);
});

test('raw header output fails closed when required endpoint headers are absent', () => {
  assert.throws(() => rawHeaderRoutes(new Map([
    ['/raw/health/guide.md', { headers: new Headers() }],
  ])), /Missing content-type/);
});

test('raw header integration inserts rules before filesystem without changing existing output routes', t => {
  const root = mkdtempSync(join(tmpdir(), 'healthpick-raw-headers-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, '.vercel/output');
  mkdirSync(directory, { recursive: true });
  const file = join(directory, 'config.json');
  const routes = [{ src: '^/_astro/(.*)$', continue: true }, { handle: 'filesystem' }, { src: '/.*', dest: '/404.html', status: 404 }];
  writeFileSync(file, JSON.stringify({ version: 3, routes }));
  const integration = rawStaticHeaders();
  integration.hooks['astro:config:done']({ config: { root: pathToFileURL(`${root}/`) } });
  const headers = new Headers({ 'content-type': 'text/markdown', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'noindex, follow', link: '<https://healthpick.kr/health/guide/>; rel="canonical"' });
  integration.hooks['astro:build:generated']({ routeToHeaders: new Map([['/raw/health/guide.md', { headers }]]) });
  integration.hooks['astro:build:done']();
  const result = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(result.version, 3);
  assert.equal(result.routes[1].headers.link, headers.get('link'));
  assert.deepEqual(result.routes.filter((_, index) => index !== 1), routes);
  assert.equal(result.functions, undefined);
});
