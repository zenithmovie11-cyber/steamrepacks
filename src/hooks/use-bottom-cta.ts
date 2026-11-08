import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ctaDefaults, type CtaSettings } from '@/lib/bottom-cta';

export const bottomCtaKey = ['bottom-cta'];
export function useBottomCta() {
  return useQuery({ queryKey: bottomCtaKey, refetchInterval: 15000, queryFn: async () => {
    const { data, error } = await supabase.from('bottom_cta_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data ? { ...data, id: 1 } as CtaSettings : ctaDefaults;
  } });
}