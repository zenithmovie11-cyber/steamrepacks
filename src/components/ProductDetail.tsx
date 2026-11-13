import type { ReactNode } from 'react';
import { Clock, FileText } from 'lucide-react';
import { DialogTitle } from '@/components/ui/dialog';
import { formatTime, type Post } from '@/lib/posts';
import { videoSource } from '@/lib/product-media';

export function ProductVideo({ url, title }: { url: string | null; title: string }) {
  const v = videoSource(url);
  if (!v) return null;
  return v.kind === 'file' ? (
    <video className="product-video object-contain" src={v.src} controls autoPlay muted loop playsInline preload="metadata" aria-label={`${title} video`} />
  ) : (
    <iframe className="product-video" src={v.src} title={`${title} video`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
  );
}

/** Wide landscape layout on desktop: image and video side by side, details beside the action panel. */
export function ProductDetail({ post, badges, panel }: { post: Post; badges: ReactNode; panel: ReactNode }) {
  const hasVideo = !!videoSource(post.video_url);
  const image = post.cover_url ? (
    <a href={post.cover_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border bg-muted">
      <img src={post.cover_url} alt={post.title} className="aspect-video w-full object-cover" />
    </a>
  ) : (
    <div className="post-placeholder flex aspect-video items-center justify-center rounded-xl border"><FileText className="size-14" strokeWidth={1.25} /></div>
  );
  const info = (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-1.5">{badges}</div>
      <DialogTitle className="text-2xl leading-tight font-semibold lg:text-3xl">{post.title}</DialogTitle>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3" />Published {formatTime(post.created_at)}</p>
      {post.description && <div className="leading-relaxed whitespace-pre-wrap text-muted-foreground lg:max-h-[38vh] lg:overflow-y-auto lg:pr-2">{post.description}</div>}
    </div>
  );
  const side = <div className="h-fit space-y-4 rounded-xl border bg-muted/40 p-5">{panel}</div>;

  return hasVideo ? (
    <div className="space-y-6 p-5 lg:p-8">
      <div className="grid gap-4 md:grid-cols-2">{image}<ProductVideo url={post.video_url} title={post.title} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">{info}{side}</div>
    </div>
  ) : (
    <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-8">
      <div>{image}</div>
      <div className="space-y-6">{info}{side}</div>
    </div>
  );
}
