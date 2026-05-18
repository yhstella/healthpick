import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
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
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
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
    }),
});

export const collections = { articles };
