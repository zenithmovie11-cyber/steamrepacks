import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ShieldAlert, BadgePercent } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOffers, offersKey, offerStatus, type Offer } from "@/lib/offers";

export const Route = createFileRoute("/offers")({
  head: () => ({ meta: [
    { title: "Special Offers — Monolith Admin Panel" },
    { name: "description", content: "Create discounts, timers and announcement banners for paid posts." },
    { property: "og:title", content: "Special Offers — Monolith Admin Panel" },
    { property: "og:description", content: "Manage special offers and discount timers." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Offers,
});

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const tone: Record<string, string> = { Active: "bg-success-soft text-success", Scheduled: "bg-info-soft text-info", Expired: "bg-muted text-muted-foreground", Paused: "bg-warning-soft text-warning" };

function Offers() {
  const { user, can } = useSession();
  const allowed = can("posts.edit");
  const qc = useQueryClient();
  const offers = useOffers();
  const [editing, setEditing] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);
  const posts = useQuery({ queryKey: ["paid-posts"], enabled: allowed, queryFn: async () => {
    const { data, error } = await supabase.from("posts").select("id,title,price").eq("is_paid", true).order("title");
    if (error) throw error; return data;
  } });
  const refresh = () => qc.invalidateQueries({ queryKey: offersKey });
  const now = Date.now();
  const titles = new Map((posts.data ?? []).map((p) => [p.id, p.title]));

  async function toggle(o: Offer) {
    const { error } = await supabase.from("special_offers").update({ is_active: !o.is_active }).eq("id", o.id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(o: Offer) {
    if (!confirm(`Delete "${o.title}"?`)) return;
    const { error } = await supabase.from("special_offers").delete().eq("id", o.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="min-h-screen min-w-0 flex-1">
        <header className="dashboard-header sticky top-0 z-30 border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 lg:px-8">
            <div className="flex items-center gap-3"><SidebarTrigger aria-label="Toggle sidebar" /><span className="text-sm font-medium">Special Offers</span></div>
            {allowed && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> New offer</Button>}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          {!user || !allowed ? (
            <div className="rounded-lg border border-dashed bg-card p-12 text-center text-sm text-muted-foreground"><ShieldAlert className="mx-auto mb-3 size-8 text-destructive" />Only admins can manage offers.</div>
          ) : (
            <>
              <div className="mb-6"><p className="mb-2 text-xs font-medium text-primary">Admin Panel</p><h1 className="text-3xl font-semibold">Special Offers</h1></div>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="p-3">Offer</th><th className="p-3">Discount</th><th className="p-3">Games</th><th className="p-3">Ends</th><th className="p-3">Status</th><th className="p-3">On</th><th className="p-3"></th></tr></thead>
                  <tbody>
                    {(offers.data ?? []).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No offers yet.</td></tr>}
                    {(offers.data ?? []).map((o) => { const st = offerStatus(o, now); return (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="p-3"><p className="font-medium">{o.title}</p>{o.badge_text && <span className="badge badge-paid mt-1">{o.badge_text}</span>}</td>
                        <td className="p-3 tabular-nums">{o.discount_type === "percentage" ? `${o.discount_value}%` : `৳${o.discount_value}`} off</td>
                        <td className="max-w-48 truncate p-3">{o.post_ids.length ? o.post_ids.map((id) => titles.get(id) ?? "—").join(", ") : "All paid games"}</td>
                        <td className="p-3 whitespace-nowrap">{o.ends_at ? new Date(o.ends_at).toLocaleString() : "No end"}</td>
                        <td className="p-3"><span className={`rounded-md px-2 py-1 text-xs font-medium ${tone[st]}`}>{st}</span></td>
                        <td className="p-3"><Switch checked={o.is_active} onCheckedChange={() => toggle(o)} aria-label="Active" /></td>
                        <td className="p-3"><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(o); setOpen(true); }}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(o)}><Trash2 /></Button></div></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
      {open && <OfferDialog key={editing?.id ?? "new"} offer={editing} posts={posts.data ?? []} onClose={() => setOpen(false)} onSaved={refresh} />}
    </SidebarProvider>
  );
}

function OfferDialog({ offer, posts, onClose, onSaved }: { offer: Offer | null; posts: { id: string; title: string; price: string | null }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: offer?.title ?? "", badge_text: offer?.badge_text ?? "", discount_type: offer?.discount_type ?? "percentage", discount_value: String(offer?.discount_value ?? ""),
    post_ids: offer?.post_ids ?? [], banner_text: offer?.banner_text ?? "", show_banner: offer?.show_banner ?? false,
    starts_at: toLocal(offer?.starts_at ?? null), ends_at: toLocal(offer?.ends_at ?? null), is_active: offer?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(f.discount_value);
    if (!(v > 0) || (f.discount_type === "percentage" && v > 100)) { toast.error("Enter a valid discount"); return; }
    if (f.starts_at && f.ends_at && f.ends_at <= f.starts_at) { toast.error("End time must be after start time"); return; }
    setSaving(true);
    const row = { ...f, title: f.title.trim(), discount_value: v, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null, ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null };
    const { error } = offer ? await supabase.from("special_offers").update(row).eq("id", offer.id) : await supabase.from("special_offers").insert(row);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Offer saved"); onSaved(); onClose();
  }
  const pick = (id: string, on: boolean) => setF({ ...f, post_ids: on ? [...f.post_ids, id] : f.post_ids.filter((x) => x !== id) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><BadgePercent className="text-primary" />{offer ? "Edit offer" : "New offer"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label>Offer name</Label><Input required maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Card badge (optional)</Label><Input maxLength={30} placeholder="FLASH SALE" value={f.badge_text} onChange={(e) => setF({ ...f, badge_text: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Discount type</Label><select className="h-10 w-full rounded-md border bg-card px-3 text-sm" value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })}><option value="percentage">Percent (%)</option><option value="fixed">Fixed (৳)</option></select></div>
            <div className="space-y-1.5"><Label>Amount</Label><Input required type="number" min="0" step="any" value={f.discount_value} onChange={(e) => setF({ ...f, discount_value: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Games (none selected = all paid games)</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {posts.length === 0 && <p className="text-xs text-muted-foreground">No paid games yet.</p>}
              {posts.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><Checkbox checked={f.post_ids.includes(p.id)} onCheckedChange={(c) => pick(p.id, c === true)} /><span className="flex-1 truncate">{p.title}</span><span className="text-xs text-muted-foreground">{p.price}</span></label>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Starts (optional)</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Ends (timer)</Label><Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></div>
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center justify-between text-sm font-medium">Show announcement banner<Switch checked={f.show_banner} onCheckedChange={(c) => setF({ ...f, show_banner: c })} /></label>
            {f.show_banner && <Input maxLength={160} required placeholder="Weekend sale — 50% off all games!" value={f.banner_text} onChange={(e) => setF({ ...f, banner_text: e.target.value })} />}
          </div>
          <label className="flex items-center justify-between text-sm font-medium">Active<Switch checked={f.is_active} onCheckedChange={(c) => setF({ ...f, is_active: c })} /></label>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save offer"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
