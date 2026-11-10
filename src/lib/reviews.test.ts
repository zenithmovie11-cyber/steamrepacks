import { describe, it, expect } from 'vitest';
import { summarize, showcase, reviewSchema } from './reviews';

describe('reviews', () => {
  it('averages ratings to one decimal and counts per star', () => {
    expect(summarize([{ rating: 5 }, { rating: 5 }, { rating: 4 }])).toEqual({ average: 4.7, total: 3, dist: [0, 0, 0, 1, 2] });
  });
  it('shows only approved reviews, featured pinned first', () => {
    const list = showcase([
      { id: 'a', status: 'approved', is_featured: false, created_at: '2026-02-01' },
      { id: 'b', status: 'pending', is_featured: true, created_at: '2026-03-01' },
      { id: 'c', status: 'approved', is_featured: true, created_at: '2026-01-01' },
    ] as const as any[]);
    expect(list.map(r => r.id)).toEqual(['c', 'a']);
  });
  it('rejects ratings outside 1 to 5', () => {
    expect(reviewSchema.safeParse({ customer_name: 'A', rating: 6, comment: 'good', post_id: null }).success).toBe(false);
    expect(reviewSchema.safeParse({ customer_name: 'A', rating: 0, comment: 'good', post_id: null }).success).toBe(false);
  });
});
