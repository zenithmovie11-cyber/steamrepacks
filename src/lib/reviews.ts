import { z } from 'zod';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type Review = {
  id: string; customer_name: string; rating: number; comment: string; post_id: string | null;
  status: ReviewStatus; is_featured: boolean; admin_reply: string | null; admin_replied_at: string | null; created_at: string;
};
export type ReviewStats = { average: number; total: number; dist: number[] };

export const reviewSchema = z.object({
  customer_name: z.string().trim().min(1, 'Name is required').max(80),
  rating: z.number().int().min(1, 'Choose 1–5 stars').max(5),
  comment: z.string().trim().min(3, 'Write at least 3 characters').max(1500),
  post_id: z.string().uuid().nullable(),
});

/** Summary of a set of reviews: average to one decimal, count, and 1..5 distribution. */
export function summarize(reviews: Pick<Review, 'rating'>[]): ReviewStats {
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]!++;
  const total = reviews.length;
  const average = total ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;
  return { average, total, dist };
}

/** Homepage order: featured first, then newest. Only approved reviews are shown. */
export function showcase<T extends Pick<Review, 'status' | 'is_featured' | 'created_at'>>(reviews: T[]): T[] {
  return reviews.filter(r => r.status === 'approved')
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.created_at.localeCompare(a.created_at));
}
