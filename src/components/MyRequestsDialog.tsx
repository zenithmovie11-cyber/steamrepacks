import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DownloadButton } from '@/components/DownloadButton';
import { formatTime, type Post } from '@/lib/posts';
import { isApproved, requestStatusLabel, type PurchaseRequest } from '@/lib/product-access';

export function MyRequestsDialog({ open, onOpenChange, requests, posts }: { open: boolean; onOpenChange: (o: boolean) => void; requests: PurchaseRequest[]; posts: Post[] }) {
  const byId = new Map(posts.map(p => [p.id, p]));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border sm:max-w-2xl">
        <DialogHeader><DialogTitle>My requests</DialogTitle></DialogHeader>
        {requests.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">You haven't sent any purchase requests yet.</p> : (
          <div className="space-y-3">
            {requests.map(r => {
              const ok = isApproved(r.status);
              const tone = ok ? 'badge-free' : r.status === 'pending' ? 'badge-paid' : '';
              return (
                <div key={r.id} className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`badge ${tone}`}>{requestStatusLabel[r.status]}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(r.created_at)} · ৳{r.total}</span>
                  </div>
                  {r.admin_note && <p className="rounded-md bg-muted px-3 py-2 text-sm">Note from admin: {r.admin_note}</p>}
                  <ul className="space-y-2">
                    {r.post_ids.map(id => {
                      const p = byId.get(id);
                      return (
                        <li key={id} className="flex items-center gap-3">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{p?.title ?? 'Removed product'}</span>
                          {ok && p && (p.download_path || p.play_url) && <DownloadButton post={p} />}
                        </li>
                      );
                    })}
                  </ul>
                  {r.status === 'pending' && <p className="text-xs text-muted-foreground">An admin will check your payment details. Downloads unlock here once approved.</p>}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
