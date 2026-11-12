import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Trash2, PanelBottom } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FooterView } from '@/components/StoreFooter';
import { useSession } from '@/hooks/use-session';
import { useFooterManager } from '@/hooks/use-footer';
import { footerSchema, socialPlatforms, type FooterSettings } from '@/lib/footer';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/footer')({
  head: () => ({ meta: [
    { title: 'Footer Management — Monolith Admin' }, { name: 'description', content: 'Manage Monolith brand, footer navigation, policies, contact details and social links.' },
    { property: 'og:title', content: 'Footer Management — Monolith Admin' }, { property: 'og:description', content: 'Monolith footer management and preview.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: FooterPage,
});
function FooterPage() {
  const { can, accessLoading } = useSession();
  const allowed = can('footer.manage');
  const settings = useFooterManager(allowed);
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1"><header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Footer</span></header><main className="mx-auto max-w-6xl px-5 py-8"><div className="mb-8 flex items-center gap-3"><PanelBottom className="text-primary" /><h1 className="text-3xl font-semibold">Footer Management</h1></div>{accessLoading ? <Loader2 className="animate-spin" /> : !allowed ? <p>Access denied. Sign in with an authorized account from the library.</p> : settings.isPending ? <Loader2 className="animate-spin" /> : settings.error ? <p role="alert">Footer could not load. <Button variant="outline" onClick={() => settings.refetch()}>Retry</Button></p> : settings.data && <FooterEditor initial={settings.data} />}</main></div></SidebarProvider>;
}
function FooterEditor({ initial }: { initial: FooterSettings }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  function field(key: 'brand_name' | 'logo_url' | 'description' | 'contact_email' | 'phone' | 'address' | 'support_hours' | 'copyright_text', label: string, multiline = false) {
    const props = { id: `footer-${key}`, value: draft[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [key]: e.target.value }) };
    return <div className="grid gap-2" key={key}><Label htmlFor={props.id}>{label}</Label>{multiline ? <Textarea {...props} rows={4} /> : <Input {...props} />}</div>;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = footerSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the footer settings'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('footer_settings').upsert(parsed.data);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['footer'] });
      toast.success('Footer saved');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save footer'); }
    finally { setSaving(false); }
  }
  return <><form onSubmit={save} className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4 border-y py-4"><div className="flex items-center gap-3"><Switch id="footer-visible" checked={draft.is_visible} onCheckedChange={is_visible => setDraft({ ...draft, is_visible })} /><Label htmlFor="footer-visible">Footer visible</Label></div><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save footer</Button></div>
    <Tabs defaultValue="brand"><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="brand">Brand</TabsTrigger><TabsTrigger value="navigation">Navigation</TabsTrigger><TabsTrigger value="policies">Policy & legal</TabsTrigger><TabsTrigger value="contact">Contact & social</TabsTrigger></TabsList>
      <TabsContent value="brand" className="space-y-5 pt-5">{field('brand_name', 'Brand name')}{field('logo_url', 'Logo image URL')}{field('description', 'Brand description', true)}{field('copyright_text', 'Copyright text ({year} updates automatically)')}</TabsContent>
      <TabsContent value="navigation" className="space-y-4 pt-5">{draft.quick_links.map((link, i) => <div key={i} className="grid items-end gap-3 border-b pb-4 sm:grid-cols-[1fr_2fr_auto]"><div className="grid gap-2"><Label htmlFor={`nav-label-${i}`}>Link name</Label><Input id={`nav-label-${i}`} value={link.label} onChange={e => setDraft({ ...draft, quick_links: draft.quick_links.map((l, j) => j === i ? { ...l, label: e.target.value } : l) })} /></div><div className="grid gap-2"><Label htmlFor={`nav-url-${i}`}>Destination</Label><Input id={`nav-url-${i}`} list="footer-destinations" value={link.url} onChange={e => setDraft({ ...draft, quick_links: draft.quick_links.map((l, j) => j === i ? { ...l, url: e.target.value } : l) })} /></div><Button type="button" variant="outline" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => setDraft({ ...draft, quick_links: draft.quick_links.filter((_, j) => i !== j) })}><Trash2 /></Button></div>)}<datalist id="footer-destinations">{['#library', '#special-offers', '#lookbooks', '#reviews', '#cart', '/'].map(url => <option key={url} value={url} />)}</datalist><Button type="button" variant="outline" disabled={draft.quick_links.length >= 12} onClick={() => setDraft({ ...draft, quick_links: [...draft.quick_links, { label: 'New link', url: '/' }] })}><Plus />Add link</Button></TabsContent>
      <TabsContent value="policies" className="space-y-6 pt-5">{draft.policies.map((p, i) => <div className="space-y-4 border-b pb-6" key={i}><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><div className="grid gap-2"><Label htmlFor={`policy-title-${i}`}>Policy title</Label><Input id={`policy-title-${i}`} value={p.title} onChange={e => setDraft({ ...draft, policies: draft.policies.map((item, j) => i === j ? { ...item, title: e.target.value } : item) })} /></div><div className="grid gap-2"><Label htmlFor={`policy-slug-${i}`}>Policy address</Label><Input id={`policy-slug-${i}`} value={p.slug} onChange={e => setDraft({ ...draft, policies: draft.policies.map((item, j) => i === j ? { ...item, slug: e.target.value } : item) })} /></div><Button type="button" className="self-end" variant="outline" size="icon" aria-label={`Remove policy ${i + 1}`} onClick={() => setDraft({ ...draft, policies: draft.policies.filter((_, j) => i !== j) })}><Trash2 /></Button></div><div className="grid gap-2"><Label htmlFor={`policy-content-${i}`}>Policy content</Label><Textarea id={`policy-content-${i}`} rows={8} value={p.content} onChange={e => setDraft({ ...draft, policies: draft.policies.map((item, j) => i === j ? { ...item, content: e.target.value } : item) })} /></div></div>)}<Button type="button" variant="outline" disabled={draft.policies.length >= 8} onClick={() => setDraft({ ...draft, policies: [...draft.policies, { title: 'New policy', slug: `policy-${draft.policies.length + 1}`, content: '' }] })}><Plus />Add policy</Button></TabsContent>
      <TabsContent value="contact" className="space-y-5 pt-5"><div className="grid gap-5 sm:grid-cols-2">{field('contact_email', 'Contact email')}{field('phone', 'Phone / helpline')}{field('address', 'Address', true)}{field('support_hours', 'Support hours')}</div><h2 className="border-t pt-5 text-lg font-semibold">Social media</h2><div className="grid gap-5 sm:grid-cols-2">{socialPlatforms.map(p => <div key={p} className="grid gap-2"><Label htmlFor={`social-${p}`} className="capitalize">{p}</Label><Input id={`social-${p}`} value={draft.socials[p]} onChange={e => setDraft({ ...draft, socials: { ...draft.socials, [p]: e.target.value } })} /></div>)}</div></TabsContent>
    </Tabs></form><h2 className="mt-12 text-xl font-semibold">Live preview</h2><FooterView settings={draft} onAction={action => { if (action === 'cart') toast.info('Cart'); }} /></>;
}