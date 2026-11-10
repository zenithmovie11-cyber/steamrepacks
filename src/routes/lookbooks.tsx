import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Images, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LookbookEditor } from '@/components/LookbookEditor';
import { useSession } from '@/hooks/use-session';
import { useLookbooks, lookbookKey, lookbookBucket } from '@/hooks/use-lookbooks';
import { supabase } from '@/integrations/supabase/client';
import type { AlbumGallery } from '@/lib/lookbook';

export const Route = createFileRoute('/lookbooks')({
  head: () => ({ meta: [
    { title: 'Lookbook Gallery — Monolith Admin' },
    { name: 'description', content: 'Manage Monolith lookbook albums, images, tagged games and publishing.' },
    { property: 'og:title', content: 'Lookbook Gallery — Monolith Admin' },
    { property: 'og:description', content: 'Monolith lookbook gallery management.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: LookbooksPage,
});

function LookbooksPage() {
  const { can, accessLoading } = useSession();
  const allowed = can('slides.manage');
  const albums = useLookbooks(true, allowed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const edited = albums.data?.find(a => a.id === editingId) ?? null;
  async function remove(album: AlbumGallery) {
    if (!confirm(`Delete "${album.title}" and all its images and tags?`)) return;
    setDeleting(true);
    try {
      if (album.images.length) {
        const { error } = await supabase.storage.from(lookbookBucket).remove(album.images.map(i => i.storage_path));
        if (error) throw error;
      }
      const { error } = await supabase.from('lookbooks').delete().eq('id', album.id);
      if (error) throw error;
      if (editingId === album.id) setEditingId(null);
      await qc.invalidateQueries({ queryKey: lookbookKey });
      toast.success('Album deleted');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not delete album'); }
    finally { setDeleting(false); }
  }
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header flex items-center gap-3 border-b px-5 py-6"><SidebarTrigger /><span className="text-sm font-medium">Admin Panel / Lookbook Gallery</span></header>
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Images className="size-7 text-primary" /><h1 className="text-3xl font-semibold">Lookbook Gallery</h1></div>{allowed && <Button disabled={deleting} onClick={() => { setEditingId(null); setCreating(true); }}><Plus />New album</Button>}</div>
      {accessLoading ? <Loader2 className="animate-spin" /> : !allowed ? <p>Access denied. Sign in with an authorized account from the library.</p> : albums.isPending ? <Loader2 className="animate-spin" /> : albums.error ? <p role="alert">Albums could not load. <Button variant="outline" onClick={() => albums.refetch()}>Retry</Button></p> : <>
        {(creating || edited) && <section className="border-y py-6"><LookbookEditor key={edited?.id ?? 'new'} album={edited} onSaved={id => { setEditingId(id); setCreating(false); }} onClose={() => { setEditingId(null); setCreating(false); }} /></section>}
        {!albums.data.length && !creating ? <div className="border-t py-16 text-center"><Images className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="text-lg font-medium">No albums yet</h2></div> : <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">{albums.data.map(album => <article key={album.id} className="overflow-hidden rounded-lg border bg-card">{album.images[0] ? <img src={album.images[0].url} alt={album.title} className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-muted"><Images className="size-10 text-muted-foreground" /></div>}<div className="space-y-3 p-4"><div className="flex flex-wrap gap-2"><span className={`badge ${album.is_published ? 'badge-free' : ''}`}>{album.is_published ? 'Published' : 'Draft'}</span><span className="badge capitalize">{album.layout}</span></div><h2 className="break-words text-lg font-semibold">{album.title}</h2><p className="text-sm text-muted-foreground">{album.images.length} images · {album.hotspots.length} tags</p><div className="flex gap-2"><Button variant="outline" disabled={deleting} onClick={() => { setEditingId(album.id); setCreating(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil />Edit</Button><Button variant="ghost" size="icon" disabled={deleting} title="Delete album" aria-label={`Delete album ${album.title}`} onClick={() => remove(album)}><Trash2 className="text-destructive" /></Button></div></div></article>)}</div>}
      </>}
    </main>
  </div></SidebarProvider>;
}