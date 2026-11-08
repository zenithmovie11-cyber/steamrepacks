import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BottomCTA } from '@/components/BottomCTA';
import { useSession } from '@/hooks/use-session';
import { useBottomCta, bottomCtaKey } from '@/hooks/use-bottom-cta';
import { ctaSchema, type CtaSettings } from '@/lib/bottom-cta';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/bottom-cta')({
  head: () => ({ meta: [
    { title: 'Bottom Banner CTA — Monolith Admin' },
    { name: 'description', content: 'Manage the Monolith library bottom banner, buttons and visibility.' },
    { property: 'og:title', content: 'Bottom Banner CTA — Monolith Admin' },
    { property: 'og:description', content: 'Monolith bottom banner settings.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: BottomCtaPage,
});

function BottomCtaPage() {
  const { can, accessLoading } = useSession();
  const settings = useBottomCta();
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Bottom Banner CTA</span></header>
    <main className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="mb-8 text-3xl font-semibold">Bottom Banner CTA</h1>
      {accessLoading ? <Loader2 className="animate-spin" /> : !can('slides.manage') ? <p>Access denied. Sign in with an authorized account from the library.</p> : settings.isPending ? <Loader2 className="animate-spin" /> : settings.error ? <p role="alert">Settings could not load. <Button variant="outline" onClick={() => settings.refetch()}>Retry</Button></p> : settings.data && <SettingsForm initial={settings.data} />}
    </main>
  </div></SidebarProvider>;
}

function SettingsForm({ initial }: { initial: CtaSettings }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const textFields = [
    ['headline', 'Banner headline'], ['subtitle', 'Subtitle'],
    ['primary_button_text', 'Primary button text'], ['primary_button_link', 'Primary button link'],
    ['background_image_url', 'Background image URL'],
    ...(draft.secondary_enabled ? [['secondary_button_text', 'Secondary button text'], ['secondary_button_link', 'Secondary button link']] : []),
  ] as [keyof CtaSettings, string][];
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = ctaSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the settings'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('bottom_cta_settings').upsert({ ...parsed.data, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: bottomCtaKey });
      toast.success('Banner settings saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save'); }
    finally { setSaving(false); }
  }
  return <>
    <form onSubmit={save} className="grid gap-5">
      {textFields.map(([key, label]) => <div key={key} className="grid gap-2"><Label htmlFor={`cta-${key}`}>{label}</Label><Input id={`cta-${key}`} value={String(draft[key])} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></div>)}
      <div className="flex items-center justify-between border-y py-4"><Label htmlFor="cta-visible">Banner visible</Label><Switch id="cta-visible" checked={draft.is_visible} onCheckedChange={is_visible => setDraft({ ...draft, is_visible })} /></div>
      <div className="flex items-center justify-between"><Label htmlFor="cta-secondary">Secondary button</Label><Switch id="cta-secondary" checked={draft.secondary_enabled} onCheckedChange={secondary_enabled => setDraft({ ...draft, secondary_enabled })} /></div>
      <div className="grid gap-2"><Label>Alignment</Label><Select value={draft.alignment} onValueChange={value => { if (value === 'left' || value === 'center' || value === 'right') setDraft({ ...draft, alignment: value }); }}><SelectTrigger aria-label="Banner alignment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></div>
      <Button type="submit" disabled={saving} className="justify-self-start">{saving ? <Loader2 className="animate-spin" /> : <Save />} Save banner</Button>
    </form>
    <h2 className="mt-10 text-xl font-semibold">Preview</h2>
    <BottomCTA settings={{ ...draft, is_visible: true }} />
  </>;
}