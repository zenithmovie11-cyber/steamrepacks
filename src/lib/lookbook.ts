import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

export type Lookbook = Database['public']['Tables']['lookbooks']['Row'];
export type GalleryImage = Database['public']['Tables']['lookbook_images']['Row'] & { url: string };
export type Hotspot = Database['public']['Tables']['lookbook_hotspots']['Row'];
export type AlbumGallery = Lookbook & { images: GalleryImage[]; hotspots: Hotspot[] };
export const albumSchema = z.object({
  title: z.string().trim().min(1, 'Album title is required').max(200),
  theme: z.string().max(200), short_story: z.string().max(2000), description: z.string().max(10000),
  layout: z.enum(['grid', 'slider', 'masonry']), is_published: z.boolean(),
});
export type AlbumDraft = z.infer<typeof albumSchema>;
export const emptyAlbum: AlbumDraft = { title: '', theme: '', short_story: '', description: '', layout: 'grid', is_published: false };
export const hotspotSchema = z.object({ post_id: z.string().uuid(), x: z.number().finite().min(0).max(100), y: z.number().finite().min(0).max(100) });
export function imageCoordinates(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 50, y: 50 };
  const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
  return { x: clamp((clientX - rect.left) / rect.width * 100), y: clamp((clientY - rect.top) / rect.height * 100) };
}
export function publicAlbums<T extends { is_published: boolean }>(albums: T[]) { return albums.filter(album => album.is_published); }
export function validateGalleryFile(file: { type: string; size: number }) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) throw new Error('Choose a JPG, PNG, WebP or AVIF image');
  if (file.size > 20 * 1024 * 1024) throw new Error('Each image must be 20 MB or smaller');
}