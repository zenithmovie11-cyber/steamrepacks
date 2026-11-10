import { useState } from 'react';
import { Plus, Images } from 'lucide-react';
import { useLookbooks } from '@/hooks/use-lookbooks';
import type { AlbumGallery, GalleryImage, Hotspot } from '@/lib/lookbook';
import type { Post } from '@/lib/posts';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';

export function LookbookGallery({ posts, onSelect }: { posts: Post[]; onSelect: (post: Post) => void }) {
  const albums = useLookbooks();
  if (albums.isError) return <section className="mt-12 border-t pt-8"><h2 className="text-2xl font-semibold">Lookbook</h2><p className="mt-3 text-muted-foreground">Gallery unavailable.</p><Button variant="outline" onClick={() => albums.refetch()}>Retry</Button></section>;
  if (!albums.data?.length) return null;
  return <section id="lookbook" className="mt-12 space-y-10 border-t pt-8"><div className="flex items-center gap-3"><Images className="text-primary" /><h2 className="text-3xl font-semibold">Lookbook</h2></div>{albums.data.map(album => <AlbumView key={album.id} album={album} posts={posts} onSelect={onSelect} />)}</section>;
}

export function AlbumView({ album, posts, onSelect }: { album: AlbumGallery; posts: Post[]; onSelect: (post: Post) => void }) {
  const image = (item: GalleryImage) => <GalleryPhoto image={item} hotspots={album.hotspots.filter(h => h.image_id === item.id)} posts={posts} onSelect={onSelect} />;
  return <div className="min-w-0 space-y-5">
    <div className="max-w-3xl space-y-2">{album.theme && <p className="text-xs font-medium text-primary">{album.theme}</p>}<h3 className="break-words text-2xl font-semibold">{album.title}</h3>{album.short_story && <p className="break-words text-muted-foreground">{album.short_story}</p>}{album.description && <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{album.description}</p>}</div>
    {!album.images.length ? <p className="text-sm text-muted-foreground">No images</p> : album.layout === 'slider' ? <Carousel opts={{ align: 'start' }} className="pb-12"><CarouselContent>{album.images.map(i => <CarouselItem key={i.id} className="md:basis-1/2">{image(i)}</CarouselItem>)}</CarouselContent><CarouselPrevious className="bottom-0 left-0 top-auto translate-y-0" /><CarouselNext className="bottom-0 left-10 right-auto top-auto translate-y-0" /></Carousel> : <div className={album.layout === 'masonry' ? 'columns-1 gap-5 sm:columns-2 lg:columns-3' : 'grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3'}>{album.images.map(i => <div key={i.id} className="mb-5 break-inside-avoid">{image(i)}</div>)}</div>}
  </div>;
}

function GalleryPhoto({ image, hotspots, posts, onSelect }: { image: GalleryImage; hotspots: Hotspot[]; posts: Post[]; onSelect: (post: Post) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <figure className="min-w-0"><div className="relative overflow-hidden rounded-lg bg-muted">
    <img src={image.url} alt={image.caption || 'Lookbook photo'} loading="lazy" className="block h-auto w-full" />
    {hotspots.map(h => { const post = posts.find(p => p.id === h.post_id); return post ? <Button key={h.id} size="icon" className="lookbook-pin absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-foreground shadow-sm" style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-label={`View ${post.title}`} title={post.title} onClick={() => onSelect(post)}><Plus className="size-4" /></Button> : null; })}
  </div>{image.caption && <figcaption className="mt-2 break-words text-sm text-muted-foreground">{image.caption}</figcaption>}
  {hotspots.length > 0 && <div className="mt-2"><Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{hotspots.length} tagged items</Button>{expanded && <div className="flex flex-wrap gap-1">{hotspots.map(h => { const post = posts.find(p => p.id === h.post_id); return post ? <Button key={h.id} variant="outline" size="sm" className="h-auto max-w-full whitespace-normal text-left" onClick={() => onSelect(post)}>{post.title}</Button> : null; })}</div>}</div>}
  </figure>;
}