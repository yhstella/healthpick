import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDraftResponse } from './lib/draft-validation.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(process.argv[2] ?? '');
if (dirname(input) !== resolve(root, '.drafts') || !input.endsWith('.result.json')) {
  throw new Error(`Input must be a .result.json file directly inside ${root}${sep}.drafts`);
}
const draft = validateDraftResponse(JSON.parse(readFileSync(input, 'utf8').replace(/^\uFEFF/, '')));
const output = input.replace(/\.result\.json$/, '.draft.md');
writeFileSync(output, draft, { flag: 'wx' });
console.log(output);
