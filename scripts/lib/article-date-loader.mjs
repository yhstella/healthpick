import { readFile } from 'node:fs/promises';
import { articleFrontmatter } from './article-frontmatter.mjs';

// Keep Astro's glob IDs, rendering, assets and watcher; only restore date precision.
export function preserveArticleDates(loader) {
  return {
    ...loader,
    name: 'healthpick-date-preserving-glob',
    async load(context) {
      await loader.load({
        ...context,
        async parseData(entry) {
          if (!entry.filePath) throw new Error('Article date loading requires a source file');
          const raw = articleFrontmatter(await readFile(entry.filePath, 'utf8'));
          return context.parseData({
            ...entry,
            data: { ...entry.data, pubDate: raw.pubDate, updatedDate: raw.updatedDate },
          });
        },
      });
    },
  };
}
