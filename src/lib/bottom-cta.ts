import { z } from 'zod';

export function safeCtaLink(value: string) {
  const link = value.trim();
  if (!link || /[\u0000-\u0020\\]/.test(link)) return null;
  if (link.startsWith('#')) return link;
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  try { const url = new URL(link); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
const buttonLink = z.string().max(2048).refine(value => !!safeCtaLink(value), 'Use a website URL, /path or #section');
export const ctaSchema = z.object({
  id: z.literal(1), headline: z.string().trim().min(1).max(200), subtitle: z.string().max(1000),
  primary_button_text: z.string().trim().min(1).max(80), primary_button_link: buttonLink,
  secondary_enabled: z.boolean(), secondary_button_text: z.string().max(80), secondary_button_link: z.string().max(2048),
  background_image_url: z.string().max(4096).refine(value => !value || /^https?:\/\//i.test(value), 'Use an http or https image URL'),
  is_visible: z.boolean(), alignment: z.enum(['left', 'center', 'right']),
}).superRefine((value, ctx) => {
  if (value.secondary_enabled && (!value.secondary_button_text.trim() || !safeCtaLink(value.secondary_button_link))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['secondary_button_link'], message: 'Enter secondary button text and a valid link' });
  }
});
export type CtaSettings = z.infer<typeof ctaSchema>;
export const ctaDefaults: CtaSettings = {
  id: 1, headline: 'Ready to Level Up Your Gaming Experience?', subtitle: 'আপনার পছন্দের প্রিমিয়াম গেম আজই আনলক করুন',
  primary_button_text: 'Browse Special Offers', primary_button_link: '#special-offers',
  secondary_enabled: true, secondary_button_text: 'View Paid Games', secondary_button_link: '#paid-games',
  background_image_url: '', is_visible: true, alignment: 'center',
};