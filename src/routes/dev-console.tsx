import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Radio, Wallet, Server, FileText, Eye, Coins, Loader2, ShieldAlert, LogIn, Activity,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev-console")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Monolith" },
      { name: "description", content: "Admin-only panel with real overview and quick stats." },
      { property: "og:title", content: "Admin Panel — Monolith" },
      { property: "og:description", content: "Admin-only panel with real overview and quick stats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DevConsole,
});

type OverviewStats = {
  total_users: number;
  active_users: number;
  total_visitors: number;
  total_posts: number;
  posts_today: number;
  paid_posts: number;
  free_posts: number;
  revenue_today: number;
  db_size_bytes: number;
  db_connections: number;
  started_at: string;
  latency_ms: number;
};

function DevConsole() {
  const { user, can } = useSession();
  const isAdmin = can('overview.view');

  const ready = !!user && isAdmin;

  const { data, isLoading, error } = useQuery({
    queryKey: ["dev-console-overview"],
    enabled: ready,
    refetchInterval: 30_000,
    queryFn: async () => {
      const t0 = performance.now();
      const { data, error: rpcError } = await supabase.rpc("dev_console_overview");
      const latency = Math.round(performance.now() - t0);
      if (rpcError) throw rpcError;
      return { ...(data as OverviewStats), latency_ms: latency };
    },
  });

  async function signIn() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
  }

  return (
    <SidebarProvider>
    <AppSidebar />
    <div className="min-h-screen min-w-0 flex-1">
      <header className="dashboard-header sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-6 lg:px-8">
        <SidebarTrigger className="text-muted-foreground" aria-label="Toggle sidebar" />
        <h1 className="text-sm font-medium">Admin Panel</h1>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {!user && (
          <div className="mx-auto max-w-md py-16 text-center">
            <ShieldAlert className="mx-auto mb-4 size-10 text-primary" />
            <h2 className="mb-2 text-xl font-semibold">Admin only</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Sign in with one of the approved admin accounts.
            </p>
            <Button className="font-medium" onClick={signIn}>
              <LogIn /> Sign in with Google
            </Button>
          </div>
        )}

        {user && !isAdmin && (
          <div className="mx-auto max-w-md py-16 text-center">
            <ShieldAlert className="mx-auto mb-4 size-10 text-primary" />
            <h2 className="mb-2 text-xl font-semibold">Access denied</h2>
            <p className="text-sm text-muted-foreground">
              {user.email} is not an approved admin account.
            </p>
          </div>
        )}

        {ready && isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading live stats…
          </p>
        )}

        {ready && error && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm">
            Failed to load stats: {(error as Error).message}
          </div>
        )}

        {ready && data && (
          <div className="space-y-10">
            <section>
              <p className="mb-2 text-xs font-medium text-primary">Admin Panel</p>
              <h2 className="mb-6 text-3xl font-semibold">
                Overview &amp; Quick Stats
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard icon={<Users className="size-5" />} label="Total Users" value={String(data.total_users)} sub="Registered accounts" />
                <KpiCard
                  icon={<Radio className="size-5" />}
                  label="Active Users"
                  value={String(data.active_users)}
                  sub="Sessions seen in the last 5 min"
                  live
                />
                <KpiCard
                  icon={<Wallet className="size-5" />}
                  label="Today's Revenue"
                  value={`৳${data.revenue_today}`}
                  sub="No payment gateway connected"
                />
                <ServerHealth data={data} />
              </div>
            </section>

            <section className="dashboard-section">
              <h2 className="mb-5 text-xl font-semibold">
                Content
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard icon={<FileText className="size-5" />} label="Total Posts" value={String(data.total_posts)} sub={`${data.posts_today} published today`} />
                <KpiCard icon={<Coins className="size-5" />} label="Paid / Free" value={`${data.paid_posts} / ${data.free_posts}`} sub="Posts by pricing" />
                <KpiCard icon={<Eye className="size-5" />} label="Total Visitors" value={String(data.total_visitors)} sub="Unique browsers since Analytics began" />
                <KpiCard icon={<Activity className="size-5" />} label="Ping" value={`${data.latency_ms} ms`} sub="Database round-trip" />
              </div>
            </section>


          </div>
        )}
      </main>

      <footer className="border-t px-4 py-6 text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Monolith
        </Link>
      </footer>
    </div>
    </SidebarProvider>
  );
}

function KpiCard({ icon, label, value, sub, live }: {
  icon: React.ReactNode; label: string; value: string; sub: string; live?: boolean;
}) {
  return (
    <div className="metric-card min-w-0 rounded-lg border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="metric-icon flex size-10 shrink-0 items-center justify-center rounded-md">{icon}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="break-all text-3xl font-semibold tabular-nums">{value}</span>
        {live && <span className="metric-live size-2 shrink-0 animate-pulse rounded-full" aria-label="live" />}
      </div>
      <p className={cn("mt-1 text-xs text-muted-foreground")}>{sub}</p>
    </div>
  );
}

function ServerHealth({ data }: { data: OverviewStats }) {
  const uptimeMs = Date.now() - Date.parse(data.started_at);
  const days = Math.floor(uptimeMs / 86_400_000);
  const hours = Math.floor((uptimeMs % 86_400_000) / 3_600_000);
  const sizeMb = data.db_size_bytes / (1024 * 1024);
  const size = sizeMb >= 1024 ? `${(sizeMb / 1024).toFixed(1)} GB` : `${sizeMb.toFixed(1)} MB`;

  return (
    <div className="metric-card min-w-0 rounded-lg border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Server Health</span>
        <span className="metric-icon flex size-10 items-center justify-center rounded-md"><Server className="size-5" /></span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-primary" aria-label="healthy" />
        <span className="text-lg font-semibold">Operational</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Uptime {days}d {hours}h · DB {size} · {data.db_connections} connections
      </p>
    </div>
  );
}
