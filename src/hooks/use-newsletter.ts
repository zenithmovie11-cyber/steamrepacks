import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { newsletterDefaults, type NewsletterSettings } from '@/lib/newsletter';

export const newsletterKey = ['newsletter-settings'];
/** Returns null when the section is switched off (visitors cannot read disabled settings). */
export function useNewsletterSettings() {
  return useQuery({ queryKey: newsletterKey, refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.from('newsletter_settings').select('id,is_enabled,badge_text,title,description,placeholder,button_text,success_message,bg_color,text_color,button_color,button_text_color').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data ? { ...newsletterDefaults, ...data, id: 1 } as NewsletterSettings : null;
  } });
}
