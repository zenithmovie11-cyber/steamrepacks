import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Upload, Trash2, ArrowUp, ArrowDown, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lookbookKey, lookbookBucket } from '@/hooks/use-lookbooks';
import { albumSchema, emptyAlbum, hotspotSchema, imageCoordinates, validateGalleryFile, type AlbumDraft, type AlbumGallery, type GalleryImage } from '@/lib/lookbook';
import { AlbumView } from '@/components/LookbookGallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function LookbookEditor({ album, onSaved, onClose }: { album: AlbumGallery | null; onSaved: (id: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<AlbumDraft>(() => album ? albumSchema.parse(album) : emptyAlbum);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(album?.images[0]?.id ?? null);
  const [postId, setPostId] = useState('');
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const qc = useQueryClient();
  const posts = useQuery({ queryKey: ['lookbook-posts'], queryFn: async () => { const { data, error } = await supabase.from('posts').select('id,title,description,category,cover_url,file_url,file_name,device_support,is_paid,price,created_at,updated_at').order('title'); if (error) throw error; return data.map(p => ({ ...p, play_url: null })); } });
  const photo = album?.images.find(i => i.id === selected);
  const tags = album?.hotspots.filter(h => h.image_id === selected) ?? [];
  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    try { await action(); await qc.invalidateQueries({ queryKey: lookbookKey }); toast.success(message); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save changes'); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = albumSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Check album details'); return; }
    await run(async () => {
      const row = { ...parsed.data, updated_at: new Date().toISOString() };
      const { data, error } = album ? await supabase.from('lookbooks').update(row).eq('id', album.id).select().single() : await supabase.from('lookbooks').insert(row).select().single();
      if (error) throw error;
      onSaved(data.id);
    }, 'Album saved');
  }
  async function upload(files: File[]) {
    if (!album) return;
    await run(async () => {
      files.forEach(validateGalleryFile);
      let index = Math.max(-1, ...album.images.map(i => i.sort_order)) + 1;
      for (const file of files) {
        const path = `${album.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const result = await supabase.storage.from(lookbookBucket).upload(path, file, { contentType: file.type });
        if (result.error) throw result.error;
        const { data, error } = await supabase.from('lookbook_images').insert({ lookbook_id: album.id, storage_path: path, caption: '', sort_order: index++ }).select().single();
        if (error) { await supabase.storage.from(lookbookBucket).remove([path]); throw error; }
        setSelected(data.id);
      }
    }, 'Images uploaded');
  }
  async function removeImage(image: GalleryImage) {
    if (!confirm('Delete this image and all its tags?')) return;
    await run(async () => {
      const removed = await supabase.storage.from(lookbookBucket).remove([image.storage_path]);
      if (removed.error) throw removed.error;
      const { error } = await supabase.from('lookbook_images').delete().eq('id', image.id);
      if (error) throw error;
      setSelected(null); setActiveTag(null);
    }, 'Image deleted');
  }
  async function moveImage(index: number, offset: number) {
    if (!album) return;
    const ordered = [...album.images];
    const current = ordered[index]; const next = ordered[index + offset];
    if (!current || !next) return;
    ordered[index] = next; ordered[index + offset] = current;
    await run(async () => {
      const { error } = await supabase.from('lookbook_images').upsert(ordered.map((i, sort_order) => ({ id: i.id, lookbook_id: i.lookbook_id, storage_path: i.storage_path, caption: i.caption, sort_order })));
      if (error) throw error;
    }, 'Image order saved');
  }
  async function saveTag() {
    if (!photo) return;
    const parsed = hotspotSchema.safeParse({ post_id: postId, ...point });
    if (!parsed.success) { toast.error('Select an item and coordinates between 0 and 100'); return; }
    await run(async () => {
      const row = { ...parsed.data, image_id: photo.id };
      const { error } = activeTag ? await supabase.from('lookbook_hotspots').update(row).eq('id', activeTag) : await supabase.from('lookbook_hotspots').insert(row);
      if (error) throw error;
      setActiveTag(null);
    }, 'Tag saved');
  }
  return <div className="min-w-0 space-y-8">
    <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{album ? 'Edit album' : 'New album'}</h2><Button variant="ghost" size="icon" aria-label="Close album editor" onClick={onClose}><X /></Button></div>
    <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="album-title">Album title</Label><Input id="album-title" required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="album-theme">Theme</Label><Input id="album-theme" value={draft.theme} onChange={e => setDraft({ ...draft, theme: e.target.value })} /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="album-story">Short story</Label><Textarea id="album-story" value={draft.short_story} onChange={e => setDraft({ ...draft, short_story: e.target.value })} /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="album-description">Description</Label><Textarea id="album-description" rows={4} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className="space-y-2"><Label>Layout</Label><Select value={draft.layout} onValueChange={layout => { if (layout === 'grid' || layout === 'slider' || layout === 'masonry') setDraft({ ...draft, layout }); }}><SelectTrigger aria-label="Album layout"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="slider">Slider</SelectItem><SelectItem value="masonry">Masonry</SelectItem></SelectContent></Select></div>
      <div className="flex items-center gap-3"><Switch id="album-published" checked={draft.is_published} onCheckedChange={is_published => setDraft({ ...draft, is_published })} /><Label htmlFor="album-published">{draft.is_published ? 'Published' : 'Draft'}</Label></div>
      <Button type="submit" disabled={busy} className="justify-self-start">{busy ? <Loader2 className="animate-spin" /> : <Save />}Save album</Button>
    </form>
    {album && <>
      <section className="space-y-5 border-t pt-6"><div className="flex items-center gap-3"><Upload className="text-primary" /><h3 className="text-xl font-semibold">Images</h3></div><Input aria-label="Upload lookbook images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy} onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) void upload(files); }} />
        <div className="grid gap-4 sm:grid-cols-3">{album.images.map((i, index) => <div key={i.id} className={`overflow-hidden rounded-lg border bg-card ${selected === i.id ? 'ring-2 ring-primary' : ''}`}><Button variant="ghost" className="h-auto w-full rounded-none p-0" disabled={busy} onClick={() => { setSelected(i.id); setActiveTag(null); }} aria-label={`Edit image ${index + 1}`}><img src={i.url} alt={i.caption || `Image ${index + 1}`} className="aspect-video w-full object-cover" /></Button><div className="flex items-center justify-between p-2"><span className="text-xs text-muted-foreground">{index + 1}</span><div className="flex gap-1"><Button variant="ghost" size="icon" title="Move earlier" aria-label={`Move image ${index + 1} earlier`} disabled={busy || index === 0} onClick={() => moveImage(index, -1)}><ArrowUp /></Button><Button variant="ghost" size="icon" title="Move later" aria-label={`Move image ${index + 1} later`} disabled={busy || index === album.images.length - 1} onClick={() => moveImage(index, 1)}><ArrowDown /></Button><Button variant="ghost" size="icon" title="Delete image" aria-label={`Delete image ${index + 1}`} disabled={busy} onClick={() => removeImage(i)}><Trash2 className="text-destructive" /></Button></div></div></div>)}</div>
      </section>
      {photo && <section className="space-y-5 border-t pt-6"><h3 className="text-xl font-semibold">Hotspots & tagged items</h3><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"><div className="relative overflow-hidden rounded-lg bg-muted"><Button variant="ghost" className="block h-auto w-full rounded-none p-0" disabled={busy} aria-label="Place hotspot on image" onClick={e => { setPoint(imageCoordinates(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())); setActiveTag(null); }}><img src={photo.url} alt={photo.caption || 'Selected lookbook photo'} className="block h-auto w-full" /></Button>{tags.map((h, index) => <Button key={h.id} size="icon" className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-foreground" style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-label={`Edit tag ${index + 1}`} onClick={() => { setActiveTag(h.id); setPostId(h.post_id); setPoint({ x: h.x, y: h.y }); }}>{index + 1}</Button>)}<span className="pointer-events-none absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-card text-primary" style={{ left: `${point.x}%`, top: `${point.y}%` }}><Plus className="size-4" /></span></div>
      <div className="min-w-0 space-y-4"><div className="space-y-2"><Label>Product / game</Label><Select value={postId} onValueChange={setPostId}><SelectTrigger aria-label="Tagged product or game" className="w-full"><SelectValue placeholder="Select an item" /></SelectTrigger><SelectContent>{posts.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select>{posts.error && <p role="alert">Items could not load. <Button variant="ghost" onClick={() => posts.refetch()}>Retry</Button></p>}</div><div className="grid grid-cols-2 gap-3">{(['x', 'y'] as const).map(axis => <div key={axis} className="space-y-2"><Label htmlFor={`tag-${axis}`}>{axis.toUpperCase()} (%)</Label><Input id={`tag-${axis}`} type="number" min={0} max={100} step={0.01} value={point[axis]} onChange={e => setPoint({ ...point, [axis]: Number(e.target.value) })} /></div>)}</div><div className="flex gap-2"><Button disabled={busy || !postId} onClick={saveTag}><Save />{activeTag ? 'Update tag' : 'Add tag'}</Button>{activeTag && <Button variant="outline" disabled={busy} onClick={() => setActiveTag(null)}>Cancel</Button>}</div>
      {tags.map((h, index) => <div key={h.id} className="flex items-center gap-2 border-b py-2"><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal text-left" onClick={() => { setActiveTag(h.id); setPostId(h.post_id); setPoint({ x: h.x, y: h.y }); }}>{index + 1}. {posts.data?.find(p => p.id === h.post_id)?.title ?? 'Item unavailable'}</Button><Button variant="ghost" size="icon" disabled={busy} aria-label={`Delete tag ${index + 1}`} onClick={() => run(async () => { const { error } = await supabase.from('lookbook_hotspots').delete().eq('id', h.id); if (error) throw error; if (activeTag === h.id) setActiveTag(null); }, 'Tag deleted')}><Trash2 className="text-destructive" /></Button></div>)}
      </div></div><div className="space-y-2"><Label htmlFor={`caption-${photo.id}`}>Image caption</Label><Input key={photo.id + photo.caption} id={`caption-${photo.id}`} defaultValue={photo.caption} disabled={busy} onBlur={e => { const caption = e.target.value; if (caption !== photo.caption) void run(async () => { const { error } = await supabase.from('lookbook_images').update({ caption }).eq('id', photo.id); if (error) throw error; }, 'Caption saved'); }} /></div></section>}
      <section className="space-y-5 border-t pt-6"><h3 className="text-xl font-semibold">Preview</h3><AlbumView album={{ ...album, ...draft }} posts={posts.data ?? []} onSelect={p => toast(p.title)} /></section>
    </>}
  </div>;
}