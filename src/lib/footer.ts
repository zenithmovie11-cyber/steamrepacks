import { z } from 'zod';

export const socialPlatforms = ['facebook', 'discord', 'telegram', 'youtube', 'instagram', 'whatsapp'] as const;
export const safeFooterUrl = z.string().trim().max(2000).refine(value => {
  if (!value) return true;
  if (['/', '#library', '#special-offers', '#lookbooks', '#reviews', '#cart'].includes(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Use an HTTPS URL or a library section link');
export const footerSchema = z.object({
  id: z.literal(1), brand_name: z.string().trim().min(1).max(80), logo_url: z.string().trim().max(2000).refine(v => !v || (v.startsWith('https://') && safeFooterUrl.safeParse(v).success), 'Use an HTTPS image URL'),
  description: z.string().max(1000),
  quick_links: z.array(z.object({ label: z.string().trim().min(1).max(60), url: safeFooterUrl.refine(v => !!v, 'Add a link') })).max(12),
  policies: z.array(z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters and hyphens').max(60), title: z.string().trim().min(1).max(80), content: z.string().trim().min(1, 'Write the policy content').max(30000) })).max(8).refine(items => new Set(items.map(p => p.slug)).size === items.length, 'Policy addresses must be unique'),
  contact_email: z.union([z.literal(''), z.string().email().max(254)]), phone: z.string().max(60), address: z.string().max(500), support_hours: z.string().max(200),
  socials: z.object(Object.fromEntries(socialPlatforms.map(p => [p, safeFooterUrl])) as Record<typeof socialPlatforms[number], typeof safeFooterUrl>),
  copyright_text: z.string().max(300), is_visible: z.boolean(),
});
export type FooterSettings = z.infer<typeof footerSchema>;
export const footerDefaults: FooterSettings = {
  id: 1, brand_name: 'Monolith', logo_url: '', description: '',
  quick_links: [{ label: 'Content library', url: '#library' }, { label: 'Special offers', url: '#special-offers' }, { label: 'Lookbook', url: '#lookbooks' }, { label: 'Customer reviews', url: '#reviews' }, { label: 'Cart', url: '#cart' }],
  policies: [], contact_email: '', phone: '', address: '', support_hours: '',
  socials: { facebook: '', discord: '', telegram: '', youtube: '', instagram: '', whatsapp: '' },
  copyright_text: '© {year} Monolith. All rights reserved.', is_visible: true,
};
export function parseFooter(value: unknown) {
  if (!value) return footerDefaults;
  const row = value as Record<string, unknown>;
  return footerSchema.parse({ ...row, socials: { ...footerDefaults.socials, ...(row['socials'] as object) } });
}
export function footerCopyright(text: string, year: number) { return text.replaceAll('{year}', String(year)); }