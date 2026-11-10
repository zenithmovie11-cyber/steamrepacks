import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Check, X, Pin, PinOff, Trash2, Reply } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Stars, reviewsKey } from '@/components/CustomerReviews';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/integrations/supabase/client';
import { summarize, type Review, type ReviewStatus } from '@/lib/reviews';

export const Route = createFileRoute('/reviews')({
  head: () => ({ meta: [
    { title: 'Customer Reviews — Monolith Admin' },
    { name: 'description', content: 'Moderate, reply to and feature Monolith customer reviews.' },
    { property: 'og:title', content: 'Customer Reviews — Monolith Admin' },
    { property: 'og:description', content: 'Monolith customer review moderation.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: ReviewsPage,
});

type Filter = 'all' | ReviewStatus | 'featured';

function ReviewsPage() {
  const { can, accessLoading } = useSession();
  const allowed = can('reviews.manage');
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Customer Reviews</span></header>
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="mb-8 text-3xl font-semibold">Customer Reviews</h1>
      {accessLoading ? <Loader2 className="animate-spin" /> : !allowed ? <p>Access denied. Sign in with an authorized account from the library.</p> : <Manager />}
    </main>
  </div></SidebarProvider>;
}

function Manager() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [replying, setReplying] = useState<Review | null>(null);
  const reviews = useQuery({ queryKey: [...reviewsKey, 'manage'], queryFn: async () => {
    const { data, error } = await supabase.from('customer_reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error; return data as Review[];
  } });
  const posts = useQuery({ queryKey: ['review-posts'], queryFn: async () => {
    const { data } = await supabase.from('posts').select('id,title'); return data ?? [];
  } });
  const settings = useQuery({ queryKey: [...reviewsKey, 'settings'], queryFn: async () => {
    const { data } = await supabase.from('review_settings').select('auto_approve').eq('id', 1).maybeSingle(); return data?.auto_approve ?? false;
  } });
  const refresh = () => qc.invalidateQueries({ queryKey: reviewsKey });

  async function update(r: Review, patch: Partial<Review>, msg: string) {
    const { error } = await supabase.from('customer_reviews').update(patch).eq('id', r.id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  }
  async function remove(r: Review) {
    if (!confirm(`Permanently delete the review by ${r.customer_name}?`)) return;
    const { error } = await supabase.from('customer_reviews').delete().eq('id', r.id);
    if (error) toast.error(error.message); else { toast.success('Review deleted'); refresh(); }
  }
  async function setAuto(v: boolean) {
    const { error } = await supabase.from('review_settings').upsert({ id: 1, auto_approve: v, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success(v ? 'New reviews go live instantly' : 'New reviews need approval'); refresh(); }
  }

  if (reviews.isPending) return <Loader2 className="animate-spin" />;
  if (reviews.error) return <p role="alert">Reviews could not load. <Button variant="outline" onClick={() => reviews.refetch()}>Retry</Button></p>;
  const all = reviews.data;
  const approved = all.filter(r => r.status === 'approved');
  const s = summarize(approved);
  const pending = all.filter(r => r.status === 'pending').length;
  const shown = all.filter(r => filter === 'all' ? true : filter === 'featured' ? r.is_featured : r.status === filter);
  const postName = (id: string | null) => posts.data?.find(p => p.id === id)?.title ?? '—';

  return <div className="space-y-8">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Average rating', `${s.average.toFixed(1)} ★`], ['Published reviews', s.total], ['Pending approval', pending], ['All submissions', all.length]].map(([l, v]) =>
        <div key={l as string} className="metric-card rounded-lg border bg-card p-5"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p></div>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="content-card rounded-lg border bg-card p-5"><h2 className="mb-3 font-semibold">Rating breakdown</h2>
        {[5, 4, 3, 2, 1].map(n => { const c = s.dist[n - 1]!; const pct = s.total ? (c / s.total) * 100 : 0;
          return <div key={n} className="mb-2 flex items-center gap-3 text-sm"><span className="w-8">{n}★</span><div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-warning" style={{ width: `${pct}%` }} /></div><span className="w-8 text-right tabular-nums">{c}</span></div>; })}
      </div>
      <div className="content-card flex items-start justify-between gap-4 rounded-lg border bg-card p-5">
        <div><h2 className="font-semibold">Publish new reviews instantly</h2><p className="mt-1 text-sm text-muted-foreground">Off: every new review waits for your approval before it appears on the website.</p></div>
        <Switch checked={settings.data ?? false} onCheckedChange={setAuto} aria-label="Auto approve reviews" />
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {(['all', 'pending', 'approved', 'rejected', 'featured'] as Filter[]).map(f => <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">{f}</Button>)}
    </div>
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3">Customer</th><th className="p-3">Rating</th><th className="p-3">Comment</th><th className="p-3">Product</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>
          {shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No reviews here.</td></tr>}
          {shown.map(r => <tr key={r.id} className="border-b align-top last:border-0">
            <td className="p-3 font-medium">{r.customer_name}{r.is_featured && <Pin className="ml-1 inline size-3 text-primary" />}</td>
            <td className="p-3"><Stars value={r.rating} /></td>
            <td className="max-w-xs p-3"><p className="whitespace-pre-wrap">{r.comment}</p>{r.admin_reply && <p className="mt-2 rounded bg-muted p-2 text-xs"><b>Reply:</b> {r.admin_reply}</p>}</td>
            <td className="p-3">{postName(r.post_id)}</td>
            <td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleDateString()}</td>
            <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs capitalize ${r.status === 'approved' ? 'bg-success-soft text-success' : r.status === 'pending' ? 'bg-warning-soft text-warning' : 'bg-destructive/10 text-destructive'}`}>{r.status}</span></td>
            <td className="p-3"><div className="flex justify-end gap-1">
              {r.status !== 'approved' && <Button size="icon" variant="outline" aria-label="Approve" onClick={() => update(r, { status: 'approved' }, 'Review approved')}><Check /></Button>}
              {r.status !== 'rejected' && <Button size="icon" variant="outline" aria-label="Reject" onClick={() => update(r, { status: 'rejected', is_featured: false }, 'Review rejected')}><X /></Button>}
              <Button size="icon" variant="outline" aria-label={r.is_featured ? 'Unpin' : 'Pin as featured'} disabled={r.status !== 'approved'} onClick={() => update(r, { is_featured: !r.is_featured }, r.is_featured ? 'Unpinned' : 'Pinned to homepage')}>{r.is_featured ? <PinOff /> : <Pin />}</Button>
              <Button size="icon" variant="outline" aria-label="Reply" onClick={() => setReplying(r)}><Reply /></Button>
              <Button size="icon" variant="outline" aria-label="Delete" onClick={() => remove(r)}><Trash2 /></Button>
            </div></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {replying && <ReplyDialog review={replying} onClose={() => setReplying(null)} onSave={(text) => update(replying, { admin_reply: text || null, admin_replied_at: text ? new Date().toISOString() : null }, text ? 'Reply saved' : 'Reply removed').then(() => setReplying(null))} />}
  </div>;
}

function ReplyDialog({ review, onClose, onSave }: { review: Review; onClose: () => void; onSave: (t: string) => void }) {
  const [text, setText] = useState(review.admin_reply ?? '');
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent>
    <DialogTitle>Reply to {review.customer_name}</DialogTitle>
    <p className="text-sm text-muted-foreground">“{review.comment}”</p>
    <Label htmlFor="reply">Your reply (leave empty to remove)</Label>
    <Textarea id="reply" rows={4} maxLength={1500} value={text} onChange={e => setText(e.target.value)} />
    <Button onClick={() => onSave(text.trim())}>Save reply</Button>
  </DialogContent></Dialog>;
}
