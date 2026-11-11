import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour');
export const newsletterSchema = z.object({
  id: z.literal(1),
  is_enabled: z.boolean(),
  badge_text: z.string().max(40),
  title: z.string().trim().min(1, 'Write a title').max(120),
  description: z.string().max(400),
  placeholder: z.string().trim().min(1, 'Write placeholder text').max(60),
  button_text: z.string().trim().min(1, 'Write the button text').max(30),
  success_message: z.string().trim().min(1, 'Write a thank-you message').max(200),
  bg_color: hex, text_color: hex, button_color: hex, button_text_color: hex,
});
export type NewsletterSettings = z.infer<typeof newsletterSchema>;
export const newsletterDefaults: NewsletterSettings = {
  id: 1, is_enabled: true, badge_text: 'VIP MEMBERS', title: 'Exclusive Offers Delivered to You',
  description: 'নতুন গেম, অফার আর ডিসকাউন্টের খবর সবার আগে পেতে আপনার ইমেইল দিয়ে সাবস্ক্রাইব করুন।',
  placeholder: 'your@email.com', button_text: 'SUBSCRIBE', success_message: 'Thanks for subscribing! You are on the list.',
  bg_color: '#111827', text_color: '#ffffff', button_color: '#d9442b', button_text_color: '#ffffff',
};

export const couponSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{0,40}$/, 'Coupon: letters, numbers, - or _ only (max 40)');

/** Same rule the database enforces, so the visitor sees the error before sending. */
export const subscribeEmailSchema = z.string().trim().toLowerCase().max(254, 'Email is too long')
  .regex(/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/, 'Enter a valid email address');

export type SubscribeResult = { result: 'subscribed' | 'resubscribed' | 'already'; coupon: string | null };
export type Subscriber = { id: string; email: string; status: 'active' | 'unsubscribed'; source: string; coupon_shown: boolean; created_at: string; unsubscribed_at: string | null };
export type NewsletterStats = { total: number; active: number; unsubscribed: number; today: number; last7: number; last30: number; coupons: number; daily: { day: string; count: number }[] };

export function subscribeMessage(r: SubscribeResult, successMessage: string) {
  if (r.result === 'already') return 'You are already subscribed — thanks for staying with us!';
  if (r.result === 'resubscribed') return 'Welcome back! Your subscription is active again.';
  return successMessage;
}

/** Spreadsheet-safe CSV: quotes every cell and neutralises formula prefixes. */
export function csvCell(value: string) {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${v.replace(/"/g, '""')}"`;
}
export function subscribersCsv(rows: Subscriber[]) {
  const head = ['Email', 'Status', 'Subscribed at', 'Unsubscribed at', 'Coupon shown', 'Source'];
  const lines = rows.map(r => [r.email, r.status, r.created_at, r.unsubscribed_at ?? '', r.coupon_shown ? 'yes' : 'no', r.source].map(csvCell).join(','));
  return [head.map(csvCell).join(','), ...lines].join('\r\n');
}
