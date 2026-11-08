import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, MousePointerClick, Files, ChartNoAxesCombined, Globe2, Monitor, Radio, Loader2, ShieldAlert, RefreshCw, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { AnalyticsData, Breakdown } from "@/lib/analytics";
import { HeroSlideStats } from "@/components/HeroSlideStats";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [
    { title: "Analytics — Monolith Admin Panel" },
    { name: "description", content: "Private Monolith traffic analytics, visitor activity and technology breakdowns." },
    { property: "og:title", content: "Analytics — Monolith Admin Panel" },
    { property: "og:description", content: "Real traffic measurements for Monolith administrators." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Analytics,
});

function Analytics() {
  const { user, can } = useSession();
  const isAdmin = can('analytics.view');
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const stats = useQuery({
    queryKey: ["admin-analytics-acquisition", days], enabled: !!user && isAdmin, refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics_acquisition", { p_days: days });
      if (error) throw error;
      return data as unknown as AnalyticsData;
    },
  });
  const data = stats.data;
  const signIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Sign-in failed");
  };
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="min-h-screen min-w-0 flex-1">
        <header className="dashboard-header sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-6 lg:px-8">
          <SidebarTrigger aria-label="Toggle sidebar" className="text-muted-foreground" />
          <span className="text-sm font-medium">Admin Panel <span className="mx-2 text-muted-foreground">/</span> Analytics</span>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          {(!user || !isAdmin) ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <ShieldAlert className="mx-auto mb-4 size-10 text-primary" />
              <h1 className="mb-2 text-xl font-semibold">{user ? "Access denied" : "Admin only"}</h1>
              <p className="mb-6 text-sm text-muted-foreground">Only approved administrators can access Analytics.</p>
              {!user && <Button onClick={signIn}><LogIn /> Sign in with Google</Button>}
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div><p className="mb-2 text-xs font-medium text-primary">Admin Panel</p><h1 className="text-3xl font-semibold">Analytics</h1></div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border bg-card p-1" aria-label="Date range">
                    {([7, 30, 90] as const).map((period) => <Button key={period} size="sm" variant={days === period ? "secondary" : "ghost"} onClick={() => setDays(period)} aria-pressed={days === period}>{period} days</Button>)}
                  </div>
                  <Button variant="outline" size="icon" aria-label="Refresh analytics" title="Refresh analytics" onClick={() => stats.refetch()} disabled={stats.isFetching}><RefreshCw className={stats.isFetching ? "animate-spin" : ""} /></Button>
                </div>
              </div>
              {stats.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading analytics…</p>}
              {stats.error && <div role="alert" className="border-l-2 border-destructive p-4 text-sm">Analytics could not load. <Button variant="link" onClick={() => stats.refetch()}>Try again</Button></div>}
              {data && <div className="space-y-10">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{data.tracking_since ? `Tracking since ${new Date(data.tracking_since).toLocaleDateString()}` : "No recorded visits yet"} · UTC</span>
                  <span className="flex items-center gap-2"><Radio className="size-4 text-primary" />{data.live} active sessions</span>
                </div>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  <Metric label="Visitors" value={String(data.visitors)} icon={<Users />} />
                  <Metric label="Sessions" value={String(data.sessions)} icon={<MousePointerClick />} />
                  <Metric label="Page views" value={String(data.pageviews)} icon={<Files />} />
                  <Metric label="Bounce rate" value={data.bounce_rate === null ? "—" : `${data.bounce_rate}%`} icon={<ChartNoAxesCombined />} />
                </div>
                <section className="dashboard-section">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Traffic over time</h2><div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-sm bg-info" />Page views</span><span className="flex items-center gap-2"><span className="size-2 rounded-sm bg-success" />Visitors</span></div></div>
                  {data.pageviews === 0 ? <Empty /> : <div className="border-b pb-3">
                    <div className="flex h-48 items-end gap-1" role="img" aria-label="Daily page views and visitors">
                      {data.daily.map((day) => {
                        const maximum = Math.max(1, ...data.daily.map((item) => Math.max(item.pageviews, item.visitors)));
                        return <div key={day.day} className="flex h-full min-w-0 flex-1 items-end gap-px" title={`${day.day}: ${day.pageviews} page views, ${day.visitors} visitors`}>
                          <svg viewBox={`0 0 2 ${maximum}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden="true"><rect x="0" y={maximum - day.pageviews} width="0.9" height={day.pageviews} className="fill-info" /><rect x="1" y={maximum - day.visitors} width="0.9" height={day.visitors} className="fill-success" /></svg>
                        </div>;
                      })}
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{data.daily[0]?.day}</span><span>{data.daily.at(-1)?.day}</span></div>
                  </div>}
                </section>
                <section className="dashboard-section">
                  <h2 className="mb-2 text-xl font-semibold">Traffic Sources &amp; Acquisition</h2>
                  <p className="mb-6 text-xs text-muted-foreground">{data.acquisition_since ? `Source tracking since ${new Date(data.acquisition_since).toLocaleDateString()} · UTC.` : "No source measurements yet."} Earlier sessions stay Unknown. Direct means no external referrer was available; browsers and apps may hide it.</p>
                  <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                    <BreakdownTable title="Traffic channels" icon={<MousePointerClick />} items={data.channels} total={data.sessions} />
                    <BreakdownTable title="Referring sites" icon={<Globe2 />} items={data.referrers} total={data.sessions} />
                  </div>
                </section>
                <section className="dashboard-section">
                  <h2 className="mb-6 text-xl font-semibold">Demographics &amp; Tech Specs</h2>
                  <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                    <BreakdownTable title="Location" icon={<Globe2 />} items={data.locations.map((item) => ({ name: item.city === "Unknown" ? item.country : `${item.city}, ${item.country}`, count: item.count }))} total={data.sessions} />
                    <BreakdownTable title="Device type" icon={<Monitor />} items={data.devices} total={data.sessions} />
                    <BreakdownTable title="Browser" icon={<Globe2 />} items={data.browsers} total={data.sessions} />
                    <BreakdownTable title="Operating system" icon={<Monitor />} items={data.operating_systems} total={data.sessions} />
                  </div>
                </section>
                <BreakdownTable title="Top pages" icon={<Files />} items={data.pages} total={data.pageviews} />
                <HeroSlideStats days={days} />
                <div className="space-y-1 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
                  <p>Sessions end after 30 minutes of inactivity. Bounce rate includes completed sessions with one page view and less than 10 seconds of visible activity.</p>
                  <p>Location is approximate. Unknown means the hosting service did not provide location. Visitors are counted per browser; blocked tracking is not counted.</p>
                </div>
              </div>}
            </>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="metric-card min-w-0 rounded-lg border bg-card p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{label}</span><span className="metric-icon flex size-10 shrink-0 items-center justify-center rounded-md [&>svg]:size-5">{icon}</span></div><p className="break-all text-3xl font-semibold tabular-nums">{value}</p></div>;
}
function Empty() { return <p className="border-y py-10 text-center text-sm text-muted-foreground">No recorded activity in this period.</p>; }
function BreakdownTable({ title, icon, items = [], total }: { title: string; icon: React.ReactNode; items?: Breakdown[]; total: number }) {
  return <section className="min-w-0"><h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="text-primary [&>svg]:size-4">{icon}</span>{title}</h3>{items.length === 0 ? <Empty /> : <div className="divide-y border-y">{items.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-all capitalize">{item.name}</span><div className="flex shrink-0 gap-4 tabular-nums"><span>{item.count}</span><span className="w-14 text-right text-muted-foreground">{total ? Math.round(item.count / total * 100) : 0}%</span></div></div>)}</div>}</section>;
}