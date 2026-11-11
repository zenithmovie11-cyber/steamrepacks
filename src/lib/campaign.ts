import { z } from 'zod';

export const campaignSchema = z.object({
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(10000),
  button: z.string().trim().max(60),
  url: z.string().refine(v => !v || /^https:\/\//.test(v) && URL.canParse(v), 'Use a valid HTTPS link'),
});
export type CampaignDraft = z.infer<typeof campaignSchema>;
export function campaignHtml(d: CampaignDraft) {
  const escape = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(d.subject)}</title></head><body><h1>${escape(d.subject)}</h1><p>${escape(d.message).replace(/\n/g, '<br>')}</p>${d.url && d.button ? `<p><a href="${escape(d.url)}">${escape(d.button)}</a></p>` : ''}</body></html>`;
}