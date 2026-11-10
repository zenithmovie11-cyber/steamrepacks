import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { publicAlbums, type AlbumGallery } from '@/lib/lookbook';

export const lookbookKey = ['lookbooks'] as const;
export const lookbookBucket = 'lookbook-media';
export function useLookbooks(manage = false, enabled = true) {
  return useQuery({ queryKey: [...lookbookKey, manage ? 'manage' : 'public'], enabled, refetchInterval: 45000, queryFn: async (): Promise<AlbumGallery[]> => {
    let query = supabase.from('lookbooks').select('*').order('created_at', { ascending: false });
    if (!manage) query = query.eq('is_published', true);
    const { data: rows, error } = await query;
    if (error) throw error;
    const albums = manage ? rows : publicAlbums(rows);
    if (!albums.length) return [];
    const { data: images, error: imageError } = await supabase.from('lookbook_images').select('*').in('lookbook_id', albums.map(a => a.id)).order('sort_order').order('created_at');
    if (imageError) throw imageError;
    const { data: hotspots, error: tagError } = images.length ? await supabase.from('lookbook_hotspots').select('*').in('image_id', images.map(i => i.id)) : { data: [], error: null };
    if (tagError) throw tagError;
    const { data: urls, error: urlError } = images.length ? await supabase.storage.from(lookbookBucket).createSignedUrls(images.map(i => i.storage_path), 60) : { data: [], error: null };
    if (urlError) throw urlError;
    const urlMap = new Map((urls ?? []).map(u => [u.path, u.signedUrl]));
    return albums.map(a => ({ ...a, images: images.filter(i => i.lookbook_id === a.id).map(i => ({ ...i, url: urlMap.get(i.storage_path) ?? '' })), hotspots: (hotspots ?? []).filter(h => images.some(i => i.id === h.image_id && i.lookbook_id === a.id)) }));
  } });
}