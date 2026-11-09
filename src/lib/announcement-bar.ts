import { z } from 'zod';
import { safeCtaLink } from '@/lib/bottom-cta';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour');
export const announcementSchema = z.object({
  id: z.literal(1),
  message: z.string().trim().min(1, 'Write a message').max(300),
  is_enabled: z.boolean(),
  link_text: z.string().max(60),
  link_url: z.string().max(2048),
  bg_color: hex, text_color: hex,
  font_size: z.enum(['small', 'medium', 'large']),
  starts_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  is_dismissible: z.boolean(),
}).superRefine((v, ctx) => {
  if (v.link_url && !safeCtaLink(v.link_url)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['link_url'], message: 'Use a website URL, /path or #section' });
  if (v.starts_at && v.expires_at && new Date(v.expires_at) <= new Date(v.starts_at)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expires_at'], message: 'Expiry must be after the start time' });
});
export type AnnouncementSettings = z.infer<typeof announcementSchema>;
export const announcementDefaults: AnnouncementSettings = {
  id: 1, message: 'ঈদ ধামাকা অফার! ২০% ছাড় চলছে', is_enabled: false, link_text: '', link_url: '',
  bg_color: '#1f2937', text_color: '#ffffff', font_size: 'medium', starts_at: null, expires_at: null, is_dismissible: true,
};

/** Visible only when enabled and now is within [starts_at, expires_at). */
export function isAnnouncementLive(s: Pick<AnnouncementSettings, 'is_enabled' | 'message' | 'starts_at' | 'expires_at'>, now = Date.now()) {
  if (!s.is_enabled || !s.message.trim()) return false;
  if (s.starts_at && now < new Date(s.starts_at).getTime()) return false;
  if (s.expires_at && now >= new Date(s.expires_at).getTime()) return false;
  return true;
}

/** Dismissal key changes whenever the content changes, so a new message shows again. */
export function dismissKey(s: Pick<AnnouncementSettings, 'message' | 'link_url' | 'expires_at'>) {
  const raw = `${s.message}|${s.link_url}|${s.expires_at ?? ''}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return `announcement-dismissed:${h}`;
}
