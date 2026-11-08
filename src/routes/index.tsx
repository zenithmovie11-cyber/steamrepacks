import { HeroSlider } from "@/components/HeroSlider";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Plus, ShoppingCart, Check, Layers, LogIn, LogOut, Play, FileText, Download, Pencil, Trash2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostForm } from "@/components/PostForm";
import { formatTime, type Post } from "@/lib/posts";
import { useCart } from "@/lib/cart";
import { CartDialog } from "@/components/CartDialog";
import { OfferBanner } from "@/components/OfferBanner";
import { BottomCTA } from "@/components/BottomCTA";
import { useOffers, bestOffer, type Offer } from "@/lib/offers";
import { parsePrice } from "@/lib/cart";
import { useBottomCta } from '@/hooks/use-bottom-cta';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monolith — Documents & Content" },
      { name: "description", content: "Discover published documents, files and links in the Monolith content library." },
      { property: "og:title", content: "Monolith — Documents & Content" },
      { property: "og:description", content: "Browse, read and download published documents from the Monolith content library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const qc = useQueryClient();
  const { user, can } = useSession();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [paidOnly, setPaidOnly] = useState(false);
  const [viewing, setViewing] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const offersRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cart = useCart();
  const { data: offers = [] } = useOffers();
  const bottomCta = useBottomCta();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const [{ data, error }, links] = await Promise.all([
        supabase.from("posts").select("id,title,description,category,cover_url,file_url,file_name,created_at,updated_at,device_support,is_paid,price").order("created_at", { ascending: false }),
        supabase.rpc("post_play_urls"),
      ]);
      if (error) throw error;
      const map = new Map((links.data ?? []).map((l) => [l.id, l.play_url]));
      return data.map((p) => ({ ...p, play_url: map.get(p.id) ?? null })) as Post[];
    },
  });

  const categories = useMemo(() => [...new Set(posts.map((p) => p.category))].sort(), [posts]);
  const shown = useMemo(() => {
    const s = q.toLowerCase();
    return posts
      .filter((p) => cat === "all" || p.category === cat)
      .filter((p) => !paidOnly || p.is_paid)
      .filter((p) => !s || p.title.toLowerCase().includes(s) || p.description.toLowerCase().includes(s))
      .sort((a, b) => (sort === "new" ? 1 : -1) * (Date.parse(b.created_at) - Date.parse(a.created_at)));
  }, [posts, q, cat, sort, paidOnly]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["posts"] });

  async function signIn() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
  }

  async function del(p: Post) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setViewing(null);
    refresh();
  }

  const openForm = (p: Post | null) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="min-h-screen min-w-0 flex-1">
      <header className="dashboard-header sticky top-0 z-30 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground" aria-label="Toggle sidebar" />
            <span className="text-sm font-medium">Content library</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="relative border" onClick={() => setCartOpen(true)} aria-label="Cart">
              <ShoppingCart /> <span className="hidden sm:inline">Cart</span>
              {cart.ids.length > 0 && <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{cart.ids.length}</span>}
            </Button>
            {can('posts.create') && (
              <Button onClick={() => openForm(null)} className="font-medium">
                <Plus /> <span className="hidden sm:inline">Add New</span>
              </Button>
            )}
            {user ? (
              <Button variant="outline" className="border" onClick={() => supabase.auth.signOut()}>
                <LogOut /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button variant="outline" className="border" onClick={signIn}>
                <LogIn /> <span className="hidden sm:inline">Sign in</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <HeroSlider />
        <div id="special-offers" ref={offersRef}><OfferBanner /></div>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-medium text-primary">Workspace</p><h1 className="text-3xl font-semibold">Monolith library</h1></div><span className="text-sm text-muted-foreground">{posts.length} published posts</span></div>
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="metric-card flex items-center gap-4 rounded-lg border bg-card p-5"><span className="metric-icon flex size-11 shrink-0 items-center justify-center rounded-md"><FileText className="size-5" /></span><div><p className="text-xs text-muted-foreground">Published posts</p><p className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "—" : posts.length}</p></div></div>
          <div className="metric-card flex items-center gap-4 rounded-lg border bg-card p-5"><span className="metric-icon flex size-11 shrink-0 items-center justify-center rounded-md"><Layers className="size-5" /></span><div><p className="text-xs text-muted-foreground">Categories</p><p className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "—" : categories.length}</p></div></div>
          <div className="metric-card flex items-center gap-4 rounded-lg border bg-card p-5"><span className="metric-icon flex size-11 shrink-0 items-center justify-center rounded-md"><Download className="size-5" /></span><div><p className="text-xs text-muted-foreground">Free posts</p><p className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "—" : posts.filter((post) => !post.is_paid).length}</p></div></div>
        </div>
        <div className="mb-7 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input className="h-11 border bg-card pl-10 shadow-none" placeholder="Search titles & documents…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="h-11 rounded-md border bg-card px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="h-11 rounded-md border bg-card px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value as "new" | "old")}>
            <option value="new">Newest first</option>
            <option value="old">Oldest first</option>
          </select>
        </div>

        {paidOnly && (
          <div className="mb-5 flex items-center gap-2 text-sm">
            <span className="badge badge-paid">Paid games only</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setPaidOnly(false)}>Clear</Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card px-6 py-20 text-center text-sm text-muted-foreground">
            <Layers className="mx-auto mb-4 size-8 text-primary" /><p className="text-base font-medium text-foreground">No posts yet</p>
          </div>
        ) : (
          <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <article key={p.id} className="library-post card-lift flex flex-col overflow-hidden rounded-lg border bg-card">
                <Button variant="ghost" onClick={() => setViewing(p)} className="block h-auto w-full whitespace-normal rounded-none p-0 text-left hover:bg-card">
                  <div className="aspect-video overflow-hidden border-b bg-muted">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.title} loading="lazy" className="size-full object-cover " />
                    ) : (
                      <div className="post-placeholder flex size-full items-center justify-center"><FileText className="size-12" strokeWidth={1.25} /></div>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="badge">{p.category}</span>
                      <span className="badge">{p.device_support}</span>
                      {p.is_paid ? (
                        <PriceBadge post={p} offers={offers} />
                      ) : (
                        <span className="badge badge-free">Free</span>
                      )}
                    </div>
                    <h2 className="line-clamp-2 text-lg leading-snug font-semibold">{p.title}</h2>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3" />{formatTime(p.created_at)}</p>
                  </div>
                </Button>
                <div className="mt-auto flex gap-2 p-5 pt-0">
                  {p.is_paid && !p.play_url && <CartButton id={p.id} className="flex-1" />}
                  {p.play_url && <PlayButton url={p.play_url} className="flex-1" />}
                  {(can('posts.edit') || can('posts.delete')) && (
                    <>
                      {can('posts.edit') && <Button variant="outline" size="icon" className="border" onClick={() => openForm(p)} aria-label="Edit"><Pencil /></Button>}
                      {can('posts.delete') && <Button variant="outline" size="icon" className="border" onClick={() => del(p)} aria-label="Delete"><Trash2 /></Button>}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {bottomCta.data && <BottomCTA
          settings={bottomCta.data}
          onBrowseOffers={() => offersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          onViewPaid={() => {
            setPaidOnly(true);
            gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />}
      </main>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border p-0 sm:max-w-3xl">
          {viewing && (
            <>
              {viewing.cover_url && (
                <a href={viewing.cover_url} target="_blank" rel="noreferrer">
                  <img src={viewing.cover_url} alt={viewing.title} className="w-full border-b" />
                </a>
              )}
              <div className="space-y-4 p-6">
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge">{viewing.category}</span>
                  <span className="badge">{viewing.device_support}</span>
                  {viewing.is_paid ? (
                    <PriceBadge post={viewing} offers={offers} />
                  ) : (
                    <span className="badge badge-free">Free</span>
                  )}
                </div>
                <DialogTitle className="text-2xl leading-tight font-semibold">{viewing.title}</DialogTitle>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3" />Published {formatTime(viewing.created_at)}</p>
                {viewing.description && <div className="leading-relaxed whitespace-pre-wrap">{viewing.description}</div>}
                {viewing.file_url && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-4">
                    <FileText className="size-5" />
                    <span className="flex-1 truncate text-sm">{viewing.file_name ?? "Attachment"}</span>
                    <Button asChild variant="outline" className="border"><a href={viewing.file_url} target="_blank" rel="noreferrer">View</a></Button>
                    <Button asChild variant="outline" className="border"><a href={viewing.file_url} download={viewing.file_name ?? true}><Download /> Download</a></Button>
                  </div>
                )}
                <div className="flex gap-2">
                  {viewing.is_paid && !viewing.play_url && <CartButton id={viewing.id} className="h-12 flex-1 text-base" />}
                  {viewing.play_url && <PlayButton url={viewing.play_url} className="h-12 flex-1 text-base" />}
                  {(can('posts.edit') || can('posts.delete')) && (
                    <>
                      {can('posts.edit') && <Button variant="outline" className="h-12 border" onClick={() => { const p = viewing; setViewing(null); openForm(p); }}><Pencil /> Edit</Button>}
                      {can('posts.delete') && <Button variant="outline" className="h-12 border" onClick={() => del(viewing)}><Trash2 /> Delete</Button>}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CartDialog open={cartOpen} onOpenChange={setCartOpen} posts={posts} offers={offers} signedIn={!!user} onSignIn={signIn} />

      {formOpen && (
        <PostForm
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          post={editing}
          categories={categories}
          onSaved={refresh}
        />
      )}
      </div>
    </SidebarProvider>
  );
}

function PlayButton({ url, className }: { url: string; className?: string }) {
  return (
    <Button asChild className={`font-medium ${className ?? ""}`}>
      <a href={url} target="_blank" rel="noopener noreferrer"><Play className="fill-current" /> Play Now</a>
    </Button>
  );
}

function CartButton({ id, className }: { id: string; className?: string }) {
  const cart = useCart();
  const added = cart.has(id);
  return (
    <Button variant={added ? "outline" : "default"} className={`font-medium ${added ? "border" : ""} ${className ?? ""}`} onClick={() => { if (added) cart.remove(id); else { cart.add(id); toast.success("Added to cart"); } }}>
      {added ? <><Check /> In cart</> : <><ShoppingCart /> Add to cart</>}
    </Button>
  );
}

function PriceBadge({ post, offers }: { post: Post; offers: Offer[] }) {
  const price = parsePrice(post.price);
  const deal = bestOffer(post.id, price, offers, Date.now());
  if (!deal) return <span className="badge badge-paid">Paid {post.price}</span>;
  return (
    <>
      {deal.offer.badge_text && <span className="badge badge-paid">{deal.offer.badge_text}</span>}
      <span className="badge badge-paid"><s className="opacity-60">৳{price}</s> ৳{deal.price}</span>
    </>
  );
}
