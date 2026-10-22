import { readFileSync, writeFileSync } from 'node:fs';

const HEADER_NAMES = ['content-type', 'cache-control', 'x-robots-tag', 'link'];

export function rawHeaderRoutes(routeToHeaders) {
  return [...routeToHeaders.entries()]
    .filter(([pathname]) => /^\/raw\/[^/]+\/[^/]+\.md$/.test(pathname))
    .map(([pathname, { headers }]) => {
      const selected = Object.fromEntries(HEADER_NAMES.map(name => {
        const value = headers.get(name);
        if (!value) throw new Error(`Missing ${name} for ${pathname}`);
        return [name, value];
      }));
      return {
        src: `^${encodeURI(pathname).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        headers: selected,
        continue: true,
      };
    })
    .sort((a, b) => a.src.localeCompare(b.src, 'en'));
}

// Vercel's staticHeaders option currently emits CSP only, not endpoint headers.
export function rawStaticHeaders() {
  let outputConfig;
  let headers;
  return {
    name: 'healthpick-raw-static-headers',
    hooks: {
      'astro:config:done': ({ config }) => {
        outputConfig = new URL('.vercel/output/config.json', config.root);
      },
      'astro:build:generated': ({ routeToHeaders }) => {
        headers = rawHeaderRoutes(routeToHeaders);
        if (!headers.length) throw new Error('No raw Markdown response headers collected');
      },
      'astro:build:done': () => {
        const output = JSON.parse(readFileSync(outputConfig, 'utf8'));
        const index = output.routes.findIndex(route => route.handle === 'filesystem');
        if (index < 0) throw new Error('Missing Vercel filesystem route');
        output.routes.splice(index, 0, ...headers);
        writeFileSync(outputConfig, `${JSON.stringify(output, null, 2)}\n`);
      },
    },
  };
}
