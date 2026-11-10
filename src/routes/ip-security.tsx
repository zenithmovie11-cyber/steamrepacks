import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldBan, ShieldCheck, Activity, Bot, Globe, Loader2, LockKeyhole, Trash2, RefreshCw, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/use-session';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { normalizeNetwork } from '@/lib/ip-security';

export const Route = createFileRoute('/ip-security')({
  head: () => ({ meta: [
    { title: 'IP Security & Block — Monolith Admin' },
    { name: 'description', content: 'Block or allow IP addresses, rate-limit visitors and review real request logs.' },
    { property: 'og:title', content: 'IP Security & Block — Monolith Admin' },
    { property: 'og:description', content: 'Monolith firewall rules, rate limiting and threat logs.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: IpSecurityPage,
});

type Rule = { id: string; network: string; kind: 'block' | 'allow'; reason: string; expires_at: string | null; created_at: string };
type Settings = { requests_per_minute: number; block_minutes: number; rate_limit_enabled: boolean; block_bot_signals: boolean };
const defaultSettings: Settings = { requests_per_minute: 120, block_minutes: 15, rate_limit_enabled: false, block_bot_signals: false };
type Event = { id: string; ip: string; path: string; decision: string; country: string; asn: string | null; bot_signal: string | null; created_at: string };
type Overview = { rules: Rule[]; settings: Settings; stats: { requests_24h: number; blocked_24h: number; unique_ips_24h: number; bots_24h: number }; total: number; events: Event[] };

const durations = [{ v: 'perm', l: 'Permanent' }, { v: '60', l: '1 hour' }, { v: '1440', l: '24 hours' }, { v: '10080', l: '7 days' }];
const decisionTone: Record<string, string> = { allowed: 'bg-success-soft text-success', blocked: 'bg-destructive/10 text-destructive', rate_limited: 'bg-warning-soft text-warning', bot_blocked: 'bg-destructive/10 text-destructive' };

function IpSecurityPage() {
  const { user, can, accessLoading } = useSession();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const q = useQuery({ queryKey: ['ip-security', user?.id, offset], enabled: !!user && can('roles.manage'), refetchInterval: 15000, queryFn: async () => {
    const { data, error } = await supabase.rpc('ip_security_overview', { p_offset: offset });
    if (error) throw error;
    return data as unknown as Overview;
  } });
  const refresh = () => qc.invalidateQueries({ queryKey: ['ip-security'] });
  async function saveRule(network: string, kind: 'block' | 'allow', reason: string, minutes: string) {
    const net = normalizeNetwork(network);
    if (!net) { toast.error('Enter a valid IP or CIDR range'); return false; }
    const expires = minutes === 'perm' ? null : new Date(Date.now() + Number(minutes) * 60000).toISOString();
    const { error } = await supabase.rpc('manage_ip_security_rule', { p_id: null as unknown as string, p_network: net, p_kind: kind, p_reason: reason, p_expires_at: expires as unknown as string });
    if (error) { toast.error(error.message); return false; }
    toast.success(kind === 'block' ? `${net} blocked` : `${net} allowed`); refresh(); return true;
  }
  async function removeRule(r: Rule) {
    if (!confirm(`Remove ${r.network}?`)) return;
    const { error } = await supabase.rpc('manage_ip_security_rule', { p_id: r.id, p_network: r.network, p_kind: r.kind, p_reason: '', p_expires_at: null as unknown as string, p_delete: true });
    if (error) toast.error(error.message); else { toast.success('Rule removed'); refresh(); }
  }
  const d = q.data;
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-6 lg:px-8"><SidebarTrigger aria-label="Toggle sidebar" /><span className="text-sm font-medium">Admin Panel <span className="mx-2 text-muted-foreground">/</span> IP Security &amp; Block</span></header>
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      {accessLoading ? <Loader2 className="size-6 animate-spin" /> : !user || !can('roles.manage') ? <div className="py-16 text-center"><LockKeyhole className="mx-auto mb-4 size-10 text-primary" /><h1 className="text-xl font-semibold">Admin only</h1></div> : <>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-medium text-primary">Admin Panel</p><h1 className="text-3xl font-semibold">IP Security &amp; Block</h1></div><Button variant="outline" size="icon" aria-label="Refresh" onClick={refresh}><RefreshCw className={q.isFetching ? 'animate-spin' : ''} /></Button></div>
        <p className="mb-8 flex gap-2 rounded-lg border bg-info-soft p-4 text-sm text-info"><Info className="mt-0.5 size-4 shrink-0" />Rules are checked on page loads and public endpoints of the published site. This is app-level protection — it does not stop large network DDoS floods, and VPN/proxy detection is limited to the network owner (ASN) shown in logs.</p>
        {q.error && <p role="alert" className="mb-5 text-destructive">Could not load. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
          { label: 'Logged requests (24h)', value: d?.stats.requests_24h, Icon: Activity },
          { label: 'Blocked (24h)', value: d?.stats.blocked_24h, Icon: ShieldBan },
          { label: 'Unique IPs (24h)', value: d?.stats.unique_ips_24h, Icon: Globe },
          { label: 'Bot signals (24h)', value: d?.stats.bots_24h, Icon: Bot },
        ].map(({ label, value, Icon }) => <div key={label} className="metric-card flex items-center gap-4 rounded-lg border bg-card p-5"><span className="metric-icon flex size-11 items-center justify-center rounded-md"><Icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value ?? '—'}</p></div></div>)}</div>
        {d && <>
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <RuleList title="IP Blocklist" kind="block" rules={d.rules.filter(r => r.kind === 'block')} onAdd={saveRule} onRemove={removeRule} />
            <RuleList title="IP Whitelist" kind="allow" rules={d.rules.filter(r => r.kind === 'allow')} onAdd={saveRule} onRemove={removeRule} />
          </div>
          <SettingsCard settings={d.settings ?? defaultSettings} onSaved={refresh} />
          <section className="dashboard-section mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">IP logs &amp; threat intelligence</h2><span className="text-sm text-muted-foreground">{d.total} records</span></div>
            <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b bg-muted/40 text-muted-foreground"><tr>{['Time', 'IP', 'Location / network', 'Path', 'Bot', 'Decision', ''].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{d.events.map(e => <tr key={e.id}><td className="p-3 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td><td className="p-3 font-mono text-xs">{e.ip}</td><td className="p-3 text-xs">{e.country}{e.asn && <span className="block text-muted-foreground">{e.asn}</span>}</td><td className="max-w-48 truncate p-3 text-xs">{e.path}</td><td className="p-3 text-xs">{e.bot_signal ? <span className={e.bot_signal.startsWith('bad') ? 'text-destructive' : 'text-success'}>{e.bot_signal.replace(':', ' · ')}</span> : '—'}</td><td className="p-3"><span className={`rounded-md px-2 py-1 text-xs ${decisionTone[e.decision]}`}>{e.decision.replace('_', ' ')}</span></td><td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => saveRule(e.ip, 'block', 'From logs', 'perm')}>Block IP</Button></td></tr>)}</tbody></table>{!d.events.length && <p className="py-12 text-center text-sm text-muted-foreground">No requests logged yet. Logs appear once visitors use the published site.</p>}</div>
            <div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" size="icon" aria-label="Previous" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - 25))}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">Page {offset / 25 + 1}</span><Button variant="outline" size="icon" aria-label="Next" disabled={offset + 25 >= d.total} onClick={() => setOffset(o => o + 25)}><ChevronRight /></Button></div>
          </section>
        </>}
      </>}
    </main></div></SidebarProvider>;
}

function RuleList({ title, kind, rules, onAdd, onRemove }: { title: string; kind: 'block' | 'allow'; rules: Rule[]; onAdd: (n: string, k: 'block' | 'allow', r: string, m: string) => Promise<boolean>; onRemove: (r: Rule) => void }) {
  const [network, setNetwork] = useState('');
  const [reason, setReason] = useState(kind === 'block' ? 'Manual' : 'Trusted');
  const [minutes, setMinutes] = useState('perm');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); if (await onAdd(network, kind, reason, minutes)) setNetwork(''); setBusy(false); }
  return <section className="rounded-lg border bg-card p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">{kind === 'block' ? <ShieldBan className="size-5 text-destructive" /> : <ShieldCheck className="size-5 text-success" />}{title}</h2>
    <form onSubmit={submit} className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]"><Input aria-label={`${title} address`} required maxLength={60} placeholder="203.0.113.5 or 203.0.113.0/24" value={network} onChange={e => setNetwork(e.target.value)} /><Button type="submit" variant={kind === 'block' ? 'destructive' : 'default'} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{kind === 'block' ? 'Block' : 'Allow'}</Button>
      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        {kind === 'block' ? <Select value={reason} onValueChange={setReason}><SelectTrigger aria-label="Reason"><SelectValue /></SelectTrigger><SelectContent>{['Manual', 'Brute force', 'Spam', 'DDoS', 'Suspicious bot'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select> : <Input aria-label="Label" maxLength={120} value={reason} onChange={e => setReason(e.target.value)} />}
        <Select value={minutes} onValueChange={setMinutes}><SelectTrigger aria-label="Duration"><SelectValue /></SelectTrigger><SelectContent>{durations.map(x => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent></Select>
      </div></form>
    <ul className="divide-y">{rules.map(r => <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div className="min-w-0"><p className="font-mono">{r.network}</p><p className="text-xs text-muted-foreground">{r.reason} · {r.expires_at ? (new Date(r.expires_at) < new Date() ? 'expired' : `until ${new Date(r.expires_at).toLocaleString()}`) : 'permanent'}</p></div><Button size="icon" variant="outline" aria-label={`Remove ${r.network}`} onClick={() => onRemove(r)}><Trash2 /></Button></li>)}</ul>
    {!rules.length && <p className="py-4 text-center text-sm text-muted-foreground">No entries.</p>}
  </section>;
}

function SettingsCard({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [s, setS] = useState(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setS(settings), [settings]);
  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc('save_ip_security_settings', { p_rpm: s.requests_per_minute, p_block_minutes: s.block_minutes, p_rate_limit: s.rate_limit_enabled, p_block_bots: s.block_bot_signals });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success('Firewall settings saved'); onSaved(); }
  }
  return <section className="rounded-lg border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Rate limiting &amp; bot protection</h2>
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex items-center justify-between gap-4"><Label htmlFor="rl">Rate limiting &amp; auto-ban</Label><Switch id="rl" checked={s.rate_limit_enabled} onCheckedChange={v => setS({ ...s, rate_limit_enabled: v })} /></div>
      <div className="flex items-center justify-between gap-4"><Label htmlFor="bb">Block scripted bots (curl, scrapers, headless)</Label><Switch id="bb" checked={s.block_bot_signals} onCheckedChange={v => setS({ ...s, block_bot_signals: v })} /></div>
      <div className="grid gap-2"><Label htmlFor="rpm">Max page requests per minute per IP</Label><Input id="rpm" type="number" min={10} max={1000} value={s.requests_per_minute} onChange={e => setS({ ...s, requests_per_minute: Number(e.target.value) })} /></div>
      <div className="grid gap-2"><Label htmlFor="bm">Auto-ban duration (minutes)</Label><Input id="bm" type="number" min={1} max={1440} value={s.block_minutes} onChange={e => setS({ ...s, block_minutes: Number(e.target.value) })} /></div>
    </div>
    <p className="mt-4 text-xs text-muted-foreground">Whitelisted IPs are never rate-limited or blocked. Good crawlers like Googlebot are never blocked.</p>
    <Button className="mt-4" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save settings</Button>
  </section>;
}
