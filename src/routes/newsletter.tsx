import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Download, Search, Trash2, UserMinus, UserCheck, Save, Users, UserPlus, CalendarDays, Gift, Info } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewsletterView } from '@/components/NewsletterSignup';
import { useSession } from '@/hooks/use-session';
import { newsletterKey } from '@/hooks/use-newsletter';
import { supabase } from '@/integrations/supabase/client';
import { couponSchema, newsletterDefaults, newsletterSchema, subscribersCsv, type NewsletterSettings, type NewsletterStats, type Subscriber } from '@/lib/newsletter';
import { rewardSchema } from '@/lib/checkout';
import { CampaignBuilder } from '@/components/CampaignBuilder';

export const Route = createFileRoute('/newsletter')({
  head: () => ({ meta: [
    { title: 'Newsletter & Subscribers — Monolith Admin' },
    { name: 'description', content: 'Manage Monolith newsletter subscribers, signup design, welcome coupon and growth.' },
    { property: 'og:title', content: 'Newsletter & Subscribers — Monolith Admin' },
    { property: 'og:description', content: 'Monolith newsletter subscriber management.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: NewsletterPage,
});

const adminKey = ['newsletter-admin'];
const columns = 'id,email,status,source,coupon_shown,created_at,unsubscribed_at';
type StatusFilter = 'all' | 'active' | 'unsubscribed';

function NewsletterPage() {
  const { can, accessLoading } = useSession();
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Newsletter</span></header>
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="mb-8 text-3xl font-semibold">Newsletter & Subscribers</h1>
      {accessLoading ? <Loader2 className="animate-spin" /> : !can('newsletter.manage') ? <p>Access denied. Sign in with an authorized account from the library.</p> : <Manager />}
    </main>
  </div></SidebarProvider>;
}

function Manager() {
  const stats = useQuery({ queryKey: [...adminKey, 'stats'], refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.rpc('newsletter_stats'); if (error) throw error; return data as unknown as NewsletterStats;
  } });
  const s = stats.data;
  const peak = Math.max(1, ...(s?.daily ?? []).map(d => d.count));
  const cards = [
    { label: 'Total subscribers', value: s?.total, icon: Users },
    { label: 'Active subscribers', value: s?.active, icon: UserCheck },
    { label: 'New today', value: s?.today, icon: UserPlus },
    { label: 'New in last 7 days', value: s?.last7, icon: CalendarDays },
  ];
  return <>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(c => <div key={c.label} className="metric-card flex items-center gap-4 rounded-lg border bg-card p-5"><span className="metric-icon flex size-11 shrink-0 items-center justify-center rounded-md"><c.icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{c.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{c.value ?? '—'}</p></div></div>)}
    </div>
    <div className="mb-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Daily new subscribers</h2><span className="text-xs text-muted-foreground">Last 14 days · {s?.last30 ?? '—'} in 30 days</span></div>
        <div className="flex h-36 items-end gap-1.5">
          {(s?.daily ?? []).map(d => <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
            <span className="text-[10px] tabular-nums text-muted-foreground">{d.count || ''}</span>
            <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }} />
            <span className="text-[10px] text-muted-foreground">{d.day.slice(8)}</span>
          </div>)}
        </div>
      </div>
      <div className="grid gap-4">
        <div className="rounded-lg border bg-card p-5"><p className="text-xs text-muted-foreground">Unsubscribed</p><p className="mt-1 text-2xl font-semibold tabular-nums">{s?.unsubscribed ?? '—'}</p></div>
        <div className="rounded-lg border bg-card p-5"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Gift className="size-3.5" />Shown a welcome coupon</p><p className="mt-1 text-2xl font-semibold tabular-nums">{s?.coupons ?? '—'}</p></div>
      </div>
    </div>
    <Tabs defaultValue="subscribers">
      <TabsList className="h-auto flex-wrap"><TabsTrigger value="subscribers">Subscribers</TabsTrigger><TabsTrigger value="campaigns">Campaign drafts</TabsTrigger><TabsTrigger value="design">Design & settings</TabsTrigger></TabsList>
      <TabsContent value="subscribers" className="mt-6"><Subscribers /></TabsContent>
      <TabsContent value="design" className="mt-6"><Design /></TabsContent>
      <TabsContent value="campaigns" className="mt-6"><CampaignBuilder /></TabsContent>
    </Tabs>
    <p className="mt-10 flex gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />Sending newsletters, offer blasts and open/click tracking need a dedicated marketing email service. Export the active list as CSV to use it there.</p>
  </>;
}

function escapeLike(v: string) { return v.replace(/[\\%_]/g, m => `\\${m}`); }

function Subscribers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [exporting, setExporting] = useState(false);
  const search = q.trim().toLowerCase();
  const filtered = <T extends { ilike: (c: string, v: string) => T; eq: (c: string, v: string) => T }>(query: T) => {
    let r = query;
    if (search) r = r.ilike('email', `%${escapeLike(search)}%`);
    if (status !== 'all') r = r.eq('status', status);
    return r;
  };
  const list = useQuery({ queryKey: [...adminKey, 'list', search, status], queryFn: async () => {
    const { data, error, count } = await filtered(supabase.from('newsletter_subscribers').select(columns, { count: 'exact' })).order('created_at', { ascending: false }).limit(500);
    if (error) throw error; return { rows: data as Subscriber[], count: count ?? data.length };
  } });
  const refresh = () => qc.invalidateQueries({ queryKey: adminKey });

  async function setSubStatus(r: Subscriber, next: Subscriber['status']) {
    const { error } = await supabase.from('newsletter_subscribers').update({ status: next }).eq('id', r.id);
    if (error) toast.error(error.message); else { toast.success(next === 'active' ? 'Subscription reactivated' : 'Unsubscribed'); refresh(); }
  }
  async function remove(r: Subscriber) {
    if (!confirm(`Permanently delete ${r.email}?`)) return;
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', r.id);
    if (error) toast.error(error.message); else { toast.success('Subscriber deleted'); refresh(); }
  }
  async function exportCsv() {
    setExporting(true);
    try {
      const rows: Subscriber[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await filtered(supabase.from('newsletter_subscribers').select(columns)).order('created_at', { ascending: false }).range(from, from + 999);
        if (error) throw error;
        rows.push(...(data as Subscriber[]));
        if (data.length < 1000) break;
      }
      const url = URL.createObjectURL(new Blob(['\uFEFF' + subscribersCsv(rows)], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `monolith-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} subscribers`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Export failed'); }
    finally { setExporting(false); }
  }

  return <>
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
      <div className="relative"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2" /><Input className="h-11 bg-card pl-10" placeholder="Search email…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search subscribers" /></div>
      <select aria-label="Filter by status" className="h-11 rounded-md border bg-card px-3 text-sm" value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
        <option value="all">All statuses</option><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option>
      </select>
      <Button variant="outline" className="h-11" onClick={exportCsv} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <Download />} Export CSV</Button>
    </div>
    {list.isPending ? <Loader2 className="animate-spin" /> : list.error ? <p role="alert">Subscribers could not load. <Button variant="outline" onClick={() => list.refetch()}>Retry</Button></p> : list.data.rows.length === 0 ? (
      <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center text-sm text-muted-foreground">No subscribers {search || status !== 'all' ? 'match this filter' : 'yet'}.</div>
    ) : <>
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b bg-muted/40"><tr><th className="p-4 font-medium">Email</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Subscribed</th><th className="p-4 font-medium">Coupon</th><th className="p-4 text-right font-medium">Actions</th></tr></thead>
        <tbody className="divide-y">{list.data.rows.map(r => <tr key={r.id}>
          <td className="p-4 font-medium">{r.email}</td>
          <td className="p-4">{r.status === 'active' ? <span className="badge badge-free">Active</span> : <span className="badge">Unsubscribed</span>}</td>
          <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
          <td className="p-4 text-muted-foreground">{r.coupon_shown ? 'Shown' : '—'}</td>
          <td className="p-4"><div className="flex justify-end gap-2">
            {r.status === 'active'
              ? <Button size="sm" variant="outline" onClick={() => setSubStatus(r, 'unsubscribed')}><UserMinus /> Unsubscribe</Button>
              : <Button size="sm" variant="outline" onClick={() => setSubStatus(r, 'active')}><UserCheck /> Reactivate</Button>}
            <Button size="icon" variant="outline" aria-label={`Delete ${r.email}`} onClick={() => remove(r)}><Trash2 /></Button>
          </div></td>
        </tr>)}</tbody>
      </table></div>
      <p className="mt-3 text-xs text-muted-foreground">{list.data.count > list.data.rows.length ? `Showing newest ${list.data.rows.length} of ${list.data.count}. Export CSV includes all.` : `${list.data.count} subscribers`}</p>
    </>}
  </>;
}

const textFields: [keyof NewsletterSettings, string][] = [
  ['badge_text', 'Badge (e.g. VIP MEMBERS, 10% OFF)'], ['title', 'Title'], ['placeholder', 'Email box placeholder'],
  ['button_text', 'Subscribe button text'], ['success_message', 'Thank-you message'],
];
const colorFields: [keyof NewsletterSettings, string][] = [
  ['bg_color', 'Background'], ['text_color', 'Text'], ['button_color', 'Button'], ['button_text_color', 'Button text'],
];

function Design() {
  const settings = useQuery({ queryKey: [...adminKey, 'settings'], queryFn: async () => {
    const [{ data, error }, reward] = await Promise.all([
      supabase.from('newsletter_settings').select('id,is_enabled,badge_text,title,description,placeholder,button_text,success_message,bg_color,text_color,button_color,button_text_color').eq('id', 1).maybeSingle(),
      supabase.from('newsletter_reward').select('coupon_code,discount_amount,expires_at').eq('id', 1).maybeSingle(),
    ]);
    if (error) throw error; if (reward.error) throw reward.error;
    return { settings: data ? { ...newsletterDefaults, ...data, id: 1 } as NewsletterSettings : newsletterDefaults, coupon: reward.data?.coupon_code ?? '', amount: Number(reward.data?.discount_amount ?? 0), expiry: reward.data?.expires_at ?? null };
  } });
  if (settings.isPending) return <Loader2 className="animate-spin" />;
  if (settings.error) return <p role="alert">Settings could not load. <Button variant="outline" onClick={() => settings.refetch()}>Retry</Button></p>;
  return <DesignForm initial={settings.data.settings} initialCoupon={settings.data.coupon} initialAmount={settings.data.amount} initialExpiry={settings.data.expiry} />;
}

function DesignForm({ initial, initialCoupon, initialAmount, initialExpiry }: { initial: NewsletterSettings; initialCoupon: string; initialAmount: number; initialExpiry: string | null }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [coupon, setCoupon] = useState(initialCoupon);
  const [amount, setAmount] = useState(initialAmount);
  const [expiry, setExpiry] = useState(initialExpiry ? new Date(new Date(initialExpiry).getTime() - new Date(initialExpiry).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newsletterSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check the settings'); return; }
    const code = couponSchema.safeParse(coupon);
    if (!code.success) { toast.error(code.error.issues[0]?.message ?? 'Check the coupon'); return; }
    const expiryDate = expiry ? new Date(expiry) : null;
    if (expiryDate && !Number.isFinite(expiryDate.getTime())) { toast.error('Check the expiry date'); return; }
    const reward = rewardSchema.safeParse({ discount_amount: amount, expires_at: expiryDate?.toISOString() ?? null });
    if (!reward.success) { toast.error('Enter a valid non-negative discount'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const [a, b] = await Promise.all([
        supabase.from('newsletter_settings').upsert({ ...parsed.data, updated_at: now }),
        supabase.from('newsletter_reward').upsert({ id: 1, coupon_code: code.data, ...reward.data, updated_at: now }),
      ]);
      if (a.error) throw a.error; if (b.error) throw b.error;
      setCoupon(code.data);
      await Promise.all([qc.invalidateQueries({ queryKey: newsletterKey }), qc.invalidateQueries({ queryKey: adminKey })]);
      toast.success('Newsletter settings saved');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save'); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
    <form onSubmit={save} className="grid content-start gap-5">
      <div className="flex items-center justify-between rounded-lg border bg-card p-4"><div><Label htmlFor="nl-enabled">Show signup on website</Label><p className="text-xs text-muted-foreground">When off, the section is hidden and new signups are refused.</p></div><Switch id="nl-enabled" checked={draft.is_enabled} onCheckedChange={is_enabled => setDraft({ ...draft, is_enabled })} /></div>
      {textFields.map(([key, label]) => <div key={key} className="grid gap-2"><Label htmlFor={`nl-${key}`}>{label}</Label><Input id={`nl-${key}`} value={String(draft[key])} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></div>)}
      <div className="grid gap-2"><Label htmlFor="nl-description">Description</Label><Textarea id="nl-description" rows={3} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className="grid gap-2 rounded-lg border bg-card p-4"><Label htmlFor="nl-coupon" className="flex items-center gap-1.5"><Gift className="size-4" />Welcome coupon code</Label><Input id="nl-coupon" value={coupon} placeholder="e.g. WELCOME10 — leave empty for no coupon" onChange={e => setCoupon(e.target.value.toUpperCase())} /><p className="text-xs text-muted-foreground">Shown only to people right after they subscribe. Visitors can't see it otherwise.</p></div>
      <div className="grid gap-2"><Label htmlFor="nl-discount">Fixed discount (৳)</Label><Input id="nl-discount" type="number" min="0" max="1000000" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
      <div className="grid gap-2"><Label htmlFor="nl-expiry">Coupon expiry (local time)</Label><Input id="nl-expiry" type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">{colorFields.map(([key, label]) => <div key={key} className="grid gap-2"><Label htmlFor={`nl-${key}`}>{label} colour</Label><div className="flex gap-2"><input type="color" aria-label={`${label} colour picker`} value={String(draft[key])} onChange={e => setDraft({ ...draft, [key]: e.target.value })} className="h-10 w-12 cursor-pointer rounded border bg-card" /><Input id={`nl-${key}`} value={String(draft[key])} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></div></div>)}</div>
      <Button type="submit" disabled={saving} className="justify-self-start">{saving ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
    </form>
    <div><h2 className="mb-3 text-sm font-medium text-muted-foreground">Live preview</h2><NewsletterView settings={draft} preview /></div>
  </div>;
}
