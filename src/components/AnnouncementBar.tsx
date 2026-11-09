import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { announcementDefaults, dismissKey, isAnnouncementLive, type AnnouncementSettings } from '@/lib/announcement-bar';
import { safeCtaLink } from '@/lib/bottom-cta';

export const announcementKey = ['announcement-bar'];
export function useAnnouncement() {
  return useQuery({ queryKey: announcementKey, refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.from('announcement_bar_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data ? { ...data, id: 1 } as AnnouncementSettings : announcementDefaults;
  } });
}

const sizes = { small: 'text-xs py-1.5', medium: 'text-sm py-2', large: 'text-base py-3' } as const;

export function AnnouncementView({ settings, onClose }: { settings: AnnouncementSettings; onClose?: () => void }) {
  const href = settings.link_url ? safeCtaLink(settings.link_url) : null;
  return <div role="region" aria-label="Announcement" style={{ backgroundColor: settings.bg_color, color: settings.text_color }} className={`relative flex items-center justify-center gap-3 px-10 text-center font-medium ${sizes[settings.font_size]}`}>
    <span>{settings.message}</span>
    {href && settings.link_text.trim() && <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="rounded-full border border-current px-3 py-0.5 text-[0.9em] font-semibold underline-offset-2 hover:underline">{settings.link_text}</a>}
    {href && !settings.link_text.trim() && <a href={href} className="absolute inset-0" aria-label={settings.message} />}
    {settings.is_dismissible && <button type="button" onClick={onClose} aria-label="Close announcement" className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1 opacity-80 hover:opacity-100"><X className="size-4" /></button>}
  </div>;
}

export function AnnouncementBar() {
  const { data } = useAnnouncement();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (data) setDismissed(localStorage.getItem(dismissKey(data))); }, [data]);
  if (path !== '/' || !data || !isAnnouncementLive(data, now)) return null;
  const key = dismissKey(data);
  if (data.is_dismissible && dismissed) return null;
  return <AnnouncementView settings={data} onClose={() => { localStorage.setItem(key, '1'); setDismissed('1'); }} />;
}
