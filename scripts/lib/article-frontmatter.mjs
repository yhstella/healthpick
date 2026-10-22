import { extractFrontmatter } from '@astrojs/markdown-remark';
import { parse } from 'yaml';

export function articleFrontmatter(source) {
  const raw = extractFrontmatter(source);
  if (raw === undefined) return {};
  // YAML core schema keeps both quoted and unquoted dates as strings.
  const data = parse(raw, { schema: 'core', merge: true });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Article frontmatter must be a YAML mapping');
  }
  return data;
}
