import { createHash } from 'node:crypto';

interface ReviewableContent {
  medical: boolean;
  title: string;
  description: string;
  tldr: string[];
  faqs: { q: string; a: string }[];
  sources: { name: string; url: string }[];
  medicalReview?: {
    reviewer: 'sung-juhyun';
    reviewedAt: Date;
    contentHash: string;
  };
}

export function medicalContentHash(data: ReviewableContent, body: string): string {
  const content = JSON.stringify({
    title: data.title,
    description: data.description,
    tldr: data.tldr,
    faqs: data.faqs,
    sources: data.sources,
    body: body.replace(/\r\n/g, '\n').trim(),
  });
  return createHash('sha256').update(content).digest('hex');
}

export function currentMedicalReview(data: ReviewableContent, body: string) {
  const review = data.medicalReview;
  if (!data.medical || !review || review.contentHash !== medicalContentHash(data, body)) {
    return null;
  }
  return review;
}
