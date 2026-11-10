import { useState } from 'react';
import { Plus, Images, Tag, ChevronDown, FileText } from 'lucide-react';
import { useLookbooks } from '@/hooks/use-lookbooks';
import type { AlbumGallery, GalleryImage, Hotspot } from '@/lib/lookbook';
import type { Post } from '@/lib/posts';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';

export function LookbookGallery({ posts, onSelect }: { posts: Post[]; onSelect: (post: Post) => void }) {
  const albums = useLookbooks();
  if (albums.isError) return <section className="mt-16 border-t pt-10"><h2 className="text-2xl font-semibold">Lookbook</h2><p className="mt-3 text-muted-foreground">Gallery unavailable.</p><Button variant="outline" onClick={() => albums.refetch()}>Retry</Button></section>;
  if (!albums.data?.length) return null;
  return <section id="lookbook" className="mt-16 space-y-8 border-t pt-10">
    <div><p className="eyebrow mb-2">Curated collections</p><div className="flex items-center gap-3"><Images className="text-primary" /><h2 className="text-3xl font-semibold">Lookbook</h2></div></div>
    {albums.data.map(album => <div key={album.id} className="premium-card lookbook-album p-5 sm:p-7"><AlbumView album={album} posts={posts} onSelect={onSelect} /></div>)}
  </section>;
}

export function AlbumView({ album, posts, onSelect }: { album: AlbumGallery; posts: Post[]; onSelect: (post: Post) => void }) {
  const image = (item: GalleryImage) => <GalleryPhoto image={item} hotspots={album.hotspots.filter(h => h.image_id === item.id)} posts={posts} onSelect={onSelect} />;
  return <div className="min-w-0 space-y-6">
    <div className="max-w-3xl space-y-2">{album.theme && <p className="eyebrow">{album.theme}</p>}<h3 className="break-words text-2xl font-semibold sm:text-3xl">{album.title}</h3>{album.short_story && <p className="break-words text-lg italic text-muted-foreground">{album.short_story}</p>}{album.description && <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{album.description}</p>}</div>
    {!album.images.length ? <p className="text-sm text-muted-foreground">No images</p> : album.layout === 'slider' ? <Carousel opts={{ align: 'start' }} className="pb-12"><CarouselContent>{album.images.map(i => <CarouselItem key={i.id} className="md:basis-1/2">{image(i)}</CarouselItem>)}</CarouselContent><CarouselPrevious className="bottom-0 left-0 top-auto translate-y-0" /><CarouselNext className="bottom-0 left-10 right-auto top-auto translate-y-0" /></Carousel> : <div className={album.layout === 'masonry' ? 'columns-1 gap-5 sm:columns-2 lg:columns-3' : 'grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3'}>{album.images.map(i => <div key={i.id} className="mb-5 break-inside-avoid">{image(i)}</div>)}</div>}
  </div>;
}

function GalleryPhoto({ image, hotspots, posts, onSelect }: { image: GalleryImage; hotspots: Hotspot[]; posts: Post[]; onSelect: (post: Post) => void }) {
  const [expanded, setExpanded] = useState(false);
  const tagged = hotspots.map(h => ({ h, post: posts.find(p => p.id === h.post_id) })).filter((t): t is { h: Hotspot; post: Post } => !!t.post);
  return <figure className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
    <div className="relative bg-muted">
      <img src={image.url} alt={image.caption || 'Lookbook photo'} loading="lazy" className="block h-auto w-full" />
      {tagged.map(({ h, post }) => <Button key={h.id} size="icon" className="lookbook-pin absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-foreground shadow-md" style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-label={`View ${post.title}`} title={post.title} onClick={() => onSelect(post)}><Plus className="size-4" /></Button>)}
      {tagged.length > 0 && <span className="glass-pill absolute left-3 top-3"><Tag className="size-3" /> {tagged.length} tagged</span>}
    </div>
    {(image.caption || tagged.length > 0) && <div className="space-y-2 p-3">
      {image.caption && <figcaption className="break-words text-sm text-muted-foreground">{image.caption}</figcaption>}
      {tagged.length > 0 && <>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>Shop this look <ChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} /></Button>
        {expanded && <div className="grid gap-2">{tagged.map(({ h, post }) => <button key={h.id} type="button" className="tag-chip flex w-full items-center gap-3 rounded-lg p-2 text-left" onClick={() => onSelect(post)}>
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">{post.cover_url ? <img src={post.cover_url} alt="" className="size-full object-cover" /> : <FileText className="size-4 text-muted-foreground" />}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{post.title}</span><span className="block text-xs text-muted-foreground">{post.is_paid ? (post.price || 'Paid') : 'Free'}</span></span>
        </button>)}</div>}
      </>}
    </div>}
  </figure>;
}
