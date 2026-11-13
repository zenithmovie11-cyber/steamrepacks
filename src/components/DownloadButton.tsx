import { useState } from 'react';
import { toast } from 'sonner';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type DownloadPost = { id: string; title: string; download_path: string | null; download_name: string | null; play_url: string | null };

/** Uploaded file → short-lived private download link; otherwise opens the product's link. */
export async function startDownload(post: DownloadPost) {
  if (post.download_path) {
    const { data, error } = await supabase.storage.from('product-files')
      .createSignedUrl(post.download_path, 300, { download: post.download_name ?? true });
    if (!error && data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    if (!post.play_url) throw new Error('This download is not available for your account yet');
  }
  if (post.play_url) { window.open(post.play_url, '_blank', 'noopener,noreferrer'); return; }
  throw new Error('No download has been added to this product yet');
}

export function DownloadButton({ post, className, size }: { post: DownloadPost; className?: string; size?: 'default' | 'lg' }) {
  const [busy, setBusy] = useState(false);
  const isLink = !post.download_path;
  return (
    <Button size={size} className={`font-medium ${className ?? ''}`} disabled={busy} onClick={async (e) => {
      e.stopPropagation(); setBusy(true);
      try { await startDownload(post); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
    }}>
      {busy ? <Loader2 className="animate-spin" /> : isLink ? <ExternalLink /> : <Download />} Download
    </Button>
  );
}
