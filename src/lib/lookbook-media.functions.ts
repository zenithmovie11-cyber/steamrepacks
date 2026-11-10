import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

/** Issues short-lived signed URLs only for images that belong to a currently published lookbook. */
export const publishedLookbookImageUrls = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ imageIds: z.array(z.string().uuid()).max(500) }).parse(input))
  .handler(async ({ data }) => {
    if (!data.imageIds.length) return [] as { id: string; url: string }[];
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: rows, error } = await supabaseAdmin
      .from('lookbook_images')
      .select('id, storage_path, lookbooks!inner(is_published)')
      .in('id', data.imageIds)
      .eq('lookbooks.is_published', true);
    if (error) throw new Error('Gallery images could not load');
    if (!rows?.length) return [];
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from('lookbook-media')
      .createSignedUrls(rows.map(r => r.storage_path), 60);
    if (signError) throw new Error('Gallery images could not load');
    const byPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));
    return rows.map(r => ({ id: r.id, url: byPath.get(r.storage_path) ?? '' }));
  });
