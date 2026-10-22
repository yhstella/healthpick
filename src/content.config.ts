import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { preserveArticleDates } from '../scripts/lib/article-date-loader.mjs';
import { normalizeArticleDate } from './lib/article-dates.mjs';

const articleDate = z.string().transform((value, context) => {
  try {
    return normalizeArticleDate(value);
  } catch (error) {
    context.addIssue({ code: 'custom', message: String(error) });
    return z.NEVER;
  }
});

const articles = defineCollection({
  loader: preserveArticleDates(glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' })),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(4).max(120),
      description: z.string().min(20).max(300),
      category: z.enum([
        'health',
        'living',
        'finance',
        'tech',
        'auto',
        'travel',
        'study',
      ]),
      subcategory: z.string().optional(),
      tags: z.array(z.string()).default([]),
      pubDate: articleDate,
      updatedDate: articleDate.optional(),
      author: z.string().default('헬스픽 검증팀'),
      heroImage: image().optional(),
      heroEmoji: z.string().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      // GEO/SEO 보강 필드 (사이클 11)
      tldr: z.array(z.string()).default([]),
      faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
      sources: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
      medical: z.boolean().default(false),
      // 실제 감수 기록만 입력한다. 게시일과 수정일은 감수일이 아니다.
      medicalReview: z.object({
        reviewer: z.literal('sung-juhyun'),
        reviewedAt: z.coerce.date(),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      }).optional(),
      // 사람이 검토하고 다듬은 글을 표시한다. 자동 생성 초안은 false 로 둔다.
      manual: z.boolean().default(false),
    }).transform(({ pubDate, updatedDate, ...data }) => ({
      ...data,
      // Date objects remain sorting keys; output uses the precision-preserving ISO values.
      pubDate: new Date(pubDate),
      updatedDate: updatedDate ? new Date(updatedDate) : undefined,
      pubDateISO: pubDate,
      updatedDateISO: updatedDate,
    })),
});

export const collections = { articles };
