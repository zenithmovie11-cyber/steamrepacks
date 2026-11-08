import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type SlideStat = { id: string; title: string; clicks: number; sessions: number };
export function HeroSlideStats({ days = 30 }: { days?: 7 | 30 | 90 }) {
  const stats = useQuery({ queryKey: ["hero-slide-stats", days], refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_hero_slide_stats", { p_days: days });
    if (error) throw error;
    return data as unknown as SlideStat[];
  } });
  return <section className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Hero slide clicks</h2><span className="text-xs text-muted-foreground">Last {days} days</span></div>
    {stats.isPending ? <p className="text-sm text-muted-foreground">Loading clicks…</p> : stats.error ? <p role="alert" className="text-sm">Clicks could not load.<Button variant="link" onClick={() => stats.refetch()}>Retry</Button></p> : !stats.data?.length ? <p className="border-y py-8 text-sm text-muted-foreground">No slides yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y text-muted-foreground"><tr><th className="py-3 font-medium">Slide</th><th className="px-3 text-right font-medium">Button clicks</th><th className="text-right font-medium">Sessions</th></tr></thead><tbody className="divide-y">{stats.data.map((s) => <tr key={s.id}><td className="max-w-64 break-words py-3 pr-3">{s.title}</td><td className="px-3 text-right tabular-nums">{s.clicks}</td><td className="text-right tabular-nums">{s.sessions}</td></tr>)}</tbody></table></div>}
  </section>;
}