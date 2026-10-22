import matter from 'gray-matter';

export function validateDraftResponse(response) {
  if (response?.type !== 'result' || response.subtype !== 'success' || response.is_error || typeof response.result !== 'string') {
    throw new Error('Claude did not return a successful article result');
  }
  if (!response.result.startsWith('---\n') && !response.result.startsWith('---\r\n')) {
    throw new Error('A draft must start with YAML frontmatter');
  }
  const { data, content } = matter(response.result);
  if (data.category !== 'health' || data.draft !== true || data.medical !== true || data.manual !== false) {
    throw new Error('Draft metadata must be health, medical:true, draft:true, manual:false');
  }
  if (data.medicalReview !== undefined) throw new Error('Generated drafts cannot assert medical review');
  if (typeof data.title !== 'string' || data.title.length < 4 || data.title.length > 120 ||
      typeof data.description !== 'string' || data.description.length < 20 || data.description.length > 300 ||
      !Number.isFinite(new Date(data.pubDate).valueOf()) || !content.trim()) {
    throw new Error('Missing or invalid article metadata or body');
  }
  if (!Array.isArray(data.sources) || !data.sources.length) throw new Error('Direct sources are required');
  for (const source of data.sources) {
    const url = new URL(source.url);
    if (typeof source.name !== 'string' || !source.name.trim() || url.protocol !== 'https:' ||
        (url.pathname === '/' && !url.search) || !content.includes(source.url)) {
      throw new Error('Each source needs a name, direct HTTPS URL and a body citation');
    }
  }
  return response.result;
}
