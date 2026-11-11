import { useEffect, useState } from 'react';
import { Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { campaignHtml, campaignSchema, type CampaignDraft } from '@/lib/campaign';

const key = 'monolith-campaign-draft';
const empty: CampaignDraft = { subject: '', message: '', button: '', url: '' };
export function CampaignBuilder() {
  const [draft, setDraft] = useState(empty);
  useEffect(() => {
    try { const saved = campaignSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null')); if (saved.success) setDraft(saved.data); } catch { /* no saved draft */ }
  }, []);
  function save(download: boolean) {
    const parsed = campaignSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the campaign'); return; }
    try {
      localStorage.setItem(key, JSON.stringify(parsed.data));
      if (download) {
        const url = URL.createObjectURL(new Blob([campaignHtml(parsed.data)], { type: 'text/html;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = 'monolith-campaign.html'; a.click(); URL.revokeObjectURL(url);
      }
      toast.success(download ? 'Campaign downloaded — not sent' : 'Draft saved on this device');
    } catch { toast.error('Could not save the draft'); }
  }
  return <div className="grid gap-8 lg:grid-cols-2">
    <div className="grid content-start gap-4">
      <div className="grid gap-2"><Label htmlFor="campaign-subject">Subject</Label><Input id="campaign-subject" maxLength={150} value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="campaign-message">Message</Label><Textarea id="campaign-message" rows={8} maxLength={10000} value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="campaign-button">Button text</Label><Input id="campaign-button" maxLength={60} value={draft.button} onChange={e => setDraft({ ...draft, button: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="campaign-url">Button link</Label><Input id="campaign-url" type="url" value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })} /></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => save(false)}><Save />Save draft</Button><Button onClick={() => save(true)}><Download />Download HTML</Button></div>
    </div>
    <div className="min-w-0 border-l pl-6"><p className="mb-4 text-xs text-muted-foreground">Draft · Not sent</p><h2 className="break-words text-2xl font-semibold">{draft.subject}</h2><p className="mt-4 whitespace-pre-wrap break-words">{draft.message}</p>{draft.button && <span className="mt-6 inline-block font-semibold text-primary">{draft.button}</span>}</div>
  </div>;
}