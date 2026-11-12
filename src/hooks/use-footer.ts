import { queryOptions, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPublicFooter } from '@/lib/footer.functions';
import { parseFooter } from '@/lib/footer';

export const publicFooterOptions = queryOptions({ queryKey: ['footer', 'public'], queryFn: () => getPublicFooter() });
export function useFooterManager(enabled: boolean) {
  return useQuery({ queryKey: ['footer', 'manager'], enabled, queryFn: async () => {
    const { data, error } = await supabase.from('footer_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return parseFooter(data);
  } });
}