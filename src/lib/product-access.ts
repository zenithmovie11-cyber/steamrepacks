export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'failed' | 'cancelled';
export type PurchaseRequest = {
  id: string; post_ids: string[]; status: RequestStatus; total: number; subtotal?: number; discount_amount?: number;
  created_at: string; transaction_id: string | null; admin_note: string | null; reviewed_at: string | null;
};
type AccessPost = { id: string; is_paid: boolean; download_path: string | null; play_url: string | null };

/** Approved (or legacy paid) requests unlock their products. */
export function isApproved(status: string) { return status === 'approved' || status === 'paid'; }

export function entitledPostIds(requests: Pick<PurchaseRequest, 'post_ids' | 'status'>[]) {
  return new Set(requests.filter(r => isApproved(r.status)).flatMap(r => r.post_ids));
}
export function pendingPostIds(requests: Pick<PurchaseRequest, 'post_ids' | 'status'>[]) {
  return new Set(requests.filter(r => r.status === 'pending').flatMap(r => r.post_ids));
}

/** Free posts and approved purchases download the uploaded file first, otherwise open the given link. */
export function downloadTarget(post: AccessPost, entitled: ReadonlySet<string>, isEditor = false): 'file' | 'link' | null {
  if (post.is_paid && !isEditor && !entitled.has(post.id)) return null;
  if (post.download_path) return 'file';
  if (post.play_url) return 'link';
  return null;
}

export const requestStatusLabel: Record<RequestStatus, string> = {
  pending: 'Waiting for approval', approved: 'Approved', paid: 'Approved', rejected: 'Rejected', failed: 'Failed', cancelled: 'Cancelled',
};

/** Root folder name for a folder upload, used to name the zip. */
export function bundleName(paths: string[]) {
  const roots = new Set(paths.map(p => p.split('/')[0]).filter(Boolean));
  const root = roots.size === 1 && paths.every(p => p.includes('/')) ? [...roots][0] : 'files';
  return `${(root ?? 'files').replace(/[^\w.-]/g, '_') || 'files'}.zip`;
}
