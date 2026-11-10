import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, ShieldCheck, MessageSquareQuote, Pin, Users, BadgeCheck, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { reviewSchema, showcase, type Review, type ReviewStats } from '@/lib/reviews';
import type { Post } from '@/lib/posts';

export const reviewsKey = ['reviews'] as const;

export function Stars({ value, onChange, size = 'size-4' }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return <span className="inline-flex gap-0.5" aria-label={`${value} of 5 stars`}>
    {[1, 2, 3, 4, 5].map(n => onChange
      ? <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}><Star className={`${size} ${n <= value ? 'star-gold' : 'star-empty'}`} /></button>
      : <Star key={n} className={`${size} ${n <= value ? 'star-gold' : 'star-empty'}`} />)}
  </span>;
}

export function CustomerReviews({ posts }: { posts: Post[] }) {
  const reviews = useQuery({ queryKey: [...reviewsKey, 'public'], queryFn: async () => {
    const { data, error } = await supabase.from('customer_reviews').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(60);
    if (error) throw error; return data as Review[];
  } });
  const stats = useQuery({ queryKey: [...reviewsKey, 'stats'], queryFn: async () => {
    const { data, error } = await supabase.rpc('review_stats'); if (error) throw error; return data as unknown as ReviewStats;
  } });
  const [open, setOpen] = useState(false);
  const list = showcase(reviews.data ?? []).slice(0, 9);
  const s = stats.data ?? { average: 0, total: 0, dist: [0, 0, 0, 0, 0] };
  const positive = s.total ? Math.round(((s.dist[3]! + s.dist[4]!) / s.total) * 100) : 0;
  const postName = (id: string | null) => posts.find(p => p.id === id)?.title;

  const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

  return <section className="mt-16 border-t pt-10" aria-labelledby="reviews-title">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow mb-2">Trust &amp; credibility</p><h2 id="reviews-title" className="text-3xl font-semibold">Customer Reviews</h2><p className="mt-1 text-sm text-muted-foreground">What our customers say about us</p></div>
      <Button size="lg" onClick={() => setOpen(true)}><Star /> Write a review</Button>
    </div>
    <div className="mb-10 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div className="premium-card trust-card flex flex-col justify-center gap-3 p-6">
        <div className="flex items-end gap-2"><span className="text-5xl font-semibold tabular-nums leading-none">{Number(s.average).toFixed(1)}</span><span className="pb-1 text-sm text-muted-foreground">/ 5</span></div>
        <Stars value={Math.round(Number(s.average))} size="size-5" />
        <div className="space-y-1.5">{[5, 4, 3, 2, 1].map(n => { const c = s.dist[n - 1] ?? 0; const pct = s.total ? (c / s.total) * 100 : 0; return <div key={n} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-3 tabular-nums">{n}</span><div className="rating-track h-1.5 flex-1 overflow-hidden rounded-full"><div className="rating-fill h-full rounded-full" style={{ width: `${pct}%` }} /></div><span className="w-6 text-right tabular-nums">{c}</span></div>; })}</div>
      </div>
      <div className="metric-card premium-card trust-card flex flex-col justify-between gap-4 p-6"><span className="metric-icon flex size-11 items-center justify-center rounded-xl"><Star className="size-5" /></span><div><p className="text-xs text-muted-foreground">Average rating</p><p className="mt-1 text-3xl font-semibold tabular-nums">{Number(s.average).toFixed(1)}</p></div></div>
      <div className="metric-card premium-card trust-card flex flex-col justify-between gap-4 p-6"><span className="metric-icon flex size-11 items-center justify-center rounded-xl"><Users className="size-5" /></span><div><p className="text-xs text-muted-foreground">Approved reviews</p><p className="mt-1 text-3xl font-semibold tabular-nums">{s.total}</p></div></div>
      <div className="metric-card premium-card trust-card flex flex-col justify-between gap-4 p-6"><span className="metric-icon flex size-11 items-center justify-center rounded-xl"><ShieldCheck className="size-5" /></span><div><p className="text-xs text-muted-foreground">Happy customers (4–5★)</p><p className="mt-1 text-3xl font-semibold tabular-nums">{positive}%</p></div></div>
    </div>
    {list.length === 0 ? <div className="premium-card p-10 text-center text-sm text-muted-foreground"><MessageSquareQuote className="mx-auto mb-3 size-8 text-primary" />No reviews yet — be the first to share your feedback.</div> :
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map(r => <article key={r.id} className={`review-card premium-card flex flex-col gap-4 p-6 ${r.is_featured ? 'is-featured' : ''}`}>
          <MessageSquareQuote className="review-quote size-10" aria-hidden />
          <div className="relative flex items-center gap-3">
            <span className="review-avatar flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{initials(r.customer_name)}</span>
            <div className="min-w-0"><p className="truncate font-semibold">{r.customer_name}</p><span className="verified-pill mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"><BadgeCheck className="size-3" /> Approved review</span></div>
          </div>
          <div className="flex items-center justify-between gap-2"><Stars value={r.rating} />{r.is_featured && <span className="featured-pill inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"><Pin className="size-3" /> Featured</span>}</div>
          <p className="flex-1 break-words text-sm leading-relaxed">“{r.comment}”</p>
          <div className="text-xs text-muted-foreground">{postName(r.post_id) && <><span className="font-medium text-foreground">{postName(r.post_id)}</span> · </>}{new Date(r.created_at).toLocaleDateString()}</div>
          {r.admin_reply && <div className="reply-bubble rounded-lg p-3 text-xs"><p className="mb-1 flex items-center gap-1 font-semibold"><Store className="size-3" /> Reply from the shop</p><p className="break-words leading-relaxed">{r.admin_reply}</p></div>}
        </article>)}
      </div>}
    <ReviewDialog open={open} onOpenChange={setOpen} posts={posts} />
  </section>;
}

function ReviewDialog({ open, onOpenChange, posts }: { open: boolean; onOpenChange: (o: boolean) => void; posts: Post[] }) {
  const [form, setForm] = useState({ customer_name: '', rating: 5, comment: '', post_id: null as string | null });
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check your review'); return; }
    setBusy(true);
    const { error } = await supabase.from('customer_reviews').insert(parsed.data);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Thank you! Your review was submitted.');
    setForm({ customer_name: '', rating: 5, comment: '', post_id: null });
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: reviewsKey });
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogTitle>Write a review</DialogTitle>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="rv-name">Your name</Label><Input id="rv-name" maxLength={80} value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
      <div className="space-y-2"><Label>Rating</Label><div><Stars value={form.rating} size="size-7" onChange={n => setForm({ ...form, rating: n })} /></div></div>
      <div className="space-y-2"><Label htmlFor="rv-post">Product (optional)</Label>
        <select id="rv-post" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.post_id ?? ''} onChange={e => setForm({ ...form, post_id: e.target.value || null })}>
          <option value="">General feedback</option>{posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select></div>
      <div className="space-y-2"><Label htmlFor="rv-comment">Your review</Label><Textarea id="rv-comment" maxLength={1500} rows={4} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} /></div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? 'Submitting…' : 'Submit review'}</Button>
    </form>
  </DialogContent></Dialog>;
}
