import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AnnouncementView, announcementKey, useAnnouncement } from '@/components/AnnouncementBar';
import { useSession } from '@/hooks/use-session';
import { announcementSchema, isAnnouncementLive, type AnnouncementSettings } from '@/lib/announcement-bar';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/announcement-bar')({
  head: () => ({ meta: [
    { title: 'Announcement Bar — Monolith Admin' },
    { name: 'description', content: 'Manage the Monolith top announcement bar text, link, colours and schedule.' },
    { property: 'og:title', content: 'Announcement Bar — Monolith Admin' },
    { property: 'og:description', content: 'Monolith announcement bar settings.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: AnnouncementPage,
});

function AnnouncementPage() {
  const { can, accessLoading } = useSession();
  const q = useAnnouncement();
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Announcement Bar</span></header>
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="mb-8 text-3xl font-semibold">Announcement Bar</h1>
      {accessLoading ? <Loader2 className="animate-spin" /> : !can('slides.manage') ? <p>Access denied. Sign in with an authorized account from the library.</p> : q.isPending ? <Loader2 className="animate-spin" /> : q.error ? <p role="alert">Settings could not load. <Button variant="outline" onClick={() => q.refetch()}>Retry</Button></p> : q.data && <Form key={q.dataUpdatedAt} initial={q.data} />}
    </main>
  </div></SidebarProvider>;
}

const toLocal = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const fromLocal = (v: string) => v ? new Date(v).toISOString() : null;
const presets = [['#1f2937', '#ffffff'], ['#dc2626', '#ffffff'], ['#16a34a', '#ffffff'], ['#2563eb', '#ffffff'], ['#facc15', '#111827'], ['#7c3aed', '#ffffff']];

function Form({ initial }: { initial: AnnouncementSettings }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const set = (p: Partial<AnnouncementSettings>) => setD({ ...d, ...p });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = announcementSchema.safeParse(d);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the settings'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('announcement_bar_settings').upsert({ ...parsed.data, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: announcementKey });
      toast.success('Announcement saved');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save'); } finally { setSaving(false); }
  }
  const live = isAnnouncementLive(d);
  return <>
    <h2 className="mb-2 text-sm font-medium text-muted-foreground">Live preview {live ? '· showing on website after save' : '· hidden (off or outside schedule)'}</h2>
    <div className="mb-8 overflow-hidden rounded-md border"><AnnouncementView settings={d} onClose={() => {}} /></div>
    <form onSubmit={save} className="grid gap-5">
      <div className="flex items-center justify-between border-y py-4"><Label htmlFor="ab-on">Show announcement bar on website</Label><Switch id="ab-on" checked={d.is_enabled} onCheckedChange={is_enabled => set({ is_enabled })} /></div>
      <div className="grid gap-2"><Label htmlFor="ab-msg">Message</Label><Textarea id="ab-msg" rows={2} maxLength={300} value={d.message} onChange={e => set({ message: e.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="ab-lt">Button text (optional)</Label><Input id="ab-lt" placeholder="অফার দেখুন" value={d.link_text} onChange={e => set({ link_text: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="ab-lu">Link (https://…, /page or #section)</Label><Input id="ab-lu" placeholder="#special-offers" value={d.link_url} onChange={e => set({ link_url: e.target.value })} /></div>
      </div>
      <div className="grid gap-2"><Label>Colour presets</Label><div className="flex flex-wrap gap-2">{presets.map(([bg, fg]) => <button key={bg} type="button" aria-label={`Preset ${bg}`} onClick={() => set({ bg_color: bg, text_color: fg })} className="size-8 rounded-full border-2" style={{ backgroundColor: bg, borderColor: d.bg_color === bg ? fg : 'transparent' }} />)}</div></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2"><Label htmlFor="ab-bg">Background colour</Label><div className="flex gap-2"><input id="ab-bg" type="color" value={d.bg_color} onChange={e => set({ bg_color: e.target.value })} className="h-10 w-12 rounded border" /><Input value={d.bg_color} onChange={e => set({ bg_color: e.target.value })} aria-label="Background hex" /></div></div>
        <div className="grid gap-2"><Label htmlFor="ab-fg">Text colour</Label><div className="flex gap-2"><input id="ab-fg" type="color" value={d.text_color} onChange={e => set({ text_color: e.target.value })} className="h-10 w-12 rounded border" /><Input value={d.text_color} onChange={e => set({ text_color: e.target.value })} aria-label="Text hex" /></div></div>
        <div className="grid gap-2"><Label>Font size</Label><Select value={d.font_size} onValueChange={v => { if (v === 'small' || v === 'medium' || v === 'large') set({ font_size: v }); }}><SelectTrigger aria-label="Font size"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="small">Small</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="large">Large</SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="ab-start">Start showing (optional)</Label><Input id="ab-start" type="datetime-local" value={toLocal(d.starts_at)} onChange={e => set({ starts_at: fromLocal(e.target.value) })} /></div>
        <div className="grid gap-2"><Label htmlFor="ab-end">Expiry date (optional)</Label><Input id="ab-end" type="datetime-local" value={toLocal(d.expires_at)} onChange={e => set({ expires_at: fromLocal(e.target.value) })} /></div>
      </div>
      <div className="flex items-center justify-between border-y py-4"><Label htmlFor="ab-x">Visitors can close the bar (X button)</Label><Switch id="ab-x" checked={d.is_dismissible} onCheckedChange={is_dismissible => set({ is_dismissible })} /></div>
      <Button type="submit" disabled={saving} className="justify-self-start">{saving ? <Loader2 className="animate-spin" /> : <Save />} Save announcement</Button>
    </form>
  </>;
}
