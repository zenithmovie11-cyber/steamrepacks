import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2, X } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/lib/posts';
import { requestStatusLabel, type RequestStatus } from '@/lib/product-access';

export const Route = createFileRoute('/requests')({
  head: () => ({ meta: [
    { title: 'Purchase Requests — Monolith Admin' },
    { name: 'description', content: 'Review customer payment requests and approve product access.' },
    { property: 'og:title', content: 'Purchase Requests — Monolith Admin' },
    { property: 'og:description', content: 'Approve or reject Monolith customer purchase requests.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: RequestsPage,
});

function RequestsPage() {
  const { can, accessLoading } = useSession();
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Purchase Requests</span></header>
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="mb-8 text-3xl font-semibold">Purchase Requests</h1>
      {accessLoading ? <Loader2 className="animate-spin" /> : !can('orders.manage') ? <p>Access denied. Sign in with an authorized account from the library.</p> : <Manager />}
    </main>
  </div></SidebarProvider>;
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

function Manager() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const [o, p] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('posts').select('id,title'),
      ]);
      if (o.error) throw o.error;
      return { orders: o.data, titles: new Map((p.data ?? []).map(x => [x.id, x.title])) };
    },
  });
  async function review(id: string, status: 'approved' | 'rejected') {
    setBusy(id);
    const { error } = await supabase.rpc('review_order', { p_id: id, p_status: status, p_note: notes[id]?.trim() || null } as never);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === 'approved' ? 'Approved — customer can now download' : 'Rejected');
    void qc.invalidateQueries({ queryKey: ['admin-requests'] });
  }
  if (isLoading || !data) return <Loader2 className="animate-spin" />;
  const rows = data.orders.filter(o => filter === 'all' || o.status === filter || (filter === 'approved' && o.status === 'paid'));
  const count = (s: string) => data.orders.filter(o => o.status === s).length;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      {(['pending', 'approved', 'rejected'] as const).map(s => <div key={s} className="metric-card rounded-lg border bg-card p-5"><p className="text-xs text-muted-foreground">{requestStatusLabel[s]}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{count(s)}</p></div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map(f => <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className={filter === f ? '' : 'border'} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : requestStatusLabel[f]}</Button>)}
    </div>
    {rows.length === 0 ? <p className="rounded-lg border border-dashed bg-card px-6 py-16 text-center text-sm text-muted-foreground">No requests here.</p> :
      <div className="space-y-4">{rows.map(o => <div key={o.id} className="premium-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-semibold">{o.full_name}</p><p className="text-xs text-muted-foreground">{o.email} · {o.phone} · {formatTime(o.created_at)}</p></div>
          <div className="flex items-center gap-2"><span className="badge">{requestStatusLabel[o.status as RequestStatus] ?? o.status}</span><span className="text-lg font-semibold">৳{o.total}</span></div>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">bKash number:</span> {o.bkash_number}</p>
          <p><span className="text-muted-foreground">Transaction ID:</span> {o.transaction_id || '—'}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {o.address}, {o.city}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">Products:</span> {o.post_ids.map(id => data.titles.get(id) ?? 'Removed product').join(', ')}</p>
          {o.coupon_code && <p><span className="text-muted-foreground">Coupon:</span> {o.coupon_code} (−৳{o.discount_amount})</p>}
          {o.admin_note && <p className="sm:col-span-2"><span className="text-muted-foreground">Note:</span> {o.admin_note}</p>}
        </div>
        {o.status === 'pending' && <div className="flex flex-wrap gap-2">
          <Input className="min-w-48 flex-1 border" placeholder="Note to customer (optional)" value={notes[o.id] ?? ''} onChange={e => setNotes({ ...notes, [o.id]: e.target.value })} />
          <Button disabled={busy === o.id} onClick={() => review(o.id, 'approved')}><Check /> Approve</Button>
          <Button variant="outline" className="border" disabled={busy === o.id} onClick={() => review(o.id, 'rejected')}><X /> Reject</Button>
        </div>}
      </div>)}</div>}
  </div>;
}
