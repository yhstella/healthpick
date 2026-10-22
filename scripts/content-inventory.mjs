import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventoryHealth, summarizeInventory } from './lib/content-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const articles = inventoryHealth(root);
const summary = summarizeInventory(articles);
const report = {
  scope: 'Health Markdown files; mechanical evidence inventory, not a medical or quality approval',
  summary,
  articles,
};
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1) {
  const output = process.argv[outputIndex + 1];
  if (!output || output.startsWith('--')) throw new Error('--output requires a file path');
  writeFileSync(resolve(output), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(summary, null, 2));
