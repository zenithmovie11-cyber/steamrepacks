import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ShieldAlert, LogIn, Loader2, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { upload } from "@/components/PostForm";
import { heroSlidesKey, type HeroSlide } from "@/components/HeroSlider";
import { SliderSettings } from "@/components/SliderSettings";
import { HeroSlideStats } from "@/components/HeroSlideStats";
import { safeSlideLink } from "@/lib/hero-slides";

export const Route = createFileRoute("/hero-slides")({
  head: () => ({ meta: [
    { title: "Hero Slides — Monolith Admin Panel" },
    { name: "description", content: "Manage the homepage banner slides of the Monolith library." },
    { property: "og:title", content: "Hero Slides — Monolith Admin Panel" },
    { property: "og:description", content: "Add, edit and order homepage banner slides." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: HeroSlides,
});

function HeroSlides() {
  const { user, can } = useSession();
  const isAdmin = can('slides.manage');
  const qc = useQueryClient();
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [open, setOpen] = useState(false);
  const slides = useQuery({
    queryKey: [...heroSlidesKey, "all"], enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("hero_slides").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data as HeroSlide[];
    },
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: heroSlidesKey });
    void qc.invalidateQueries({ queryKey: ["hero-slide-stats"] });
  };
  const signIn = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
  };
  async function toggle(s: HeroSlide) {
    const { error } = await supabase.from("hero_slides").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(s: HeroSlide) {
    if (!confirm(`Delete "${s.title}"?`)) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Slide deleted"); refresh(); }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="min-h-screen min-w-0 flex-1">
        <header className="dashboard-header sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-6 lg:px-8">
          <SidebarTrigger aria-label="Toggle sidebar" className="text-muted-foreground" />
          <span className="text-sm font-medium">Admin Panel <span className="mx-2 text-muted-foreground">/</span> Hero Slides</span>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
          {(!user || !isAdmin) ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <ShieldAlert className="mx-auto mb-4 size-10 text-primary" />
              <h1 className="mb-2 text-xl font-semibold">{user ? "Access denied" : "Admin only"}</h1>
              <p className="mb-6 text-sm text-muted-foreground">Only approved administrators can manage slides.</p>
              {!user && <Button onClick={signIn}><LogIn /> Sign in with Google</Button>}
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div><p className="mb-2 text-xs font-medium text-primary">Admin Panel</p><h1 className="text-3xl font-semibold">Hero Slides</h1></div>
                <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add slide</Button>
              </div>
              <SliderSettings />
              {slides.error && <p role="alert" className="mb-4 text-sm">Slides could not load. <Button variant="link" onClick={() => slides.refetch()}>Retry</Button></p>}
              {slides.isLoading ? <Loader2 className="mx-auto size-6 animate-spin" /> : !slides.data?.length ? (
                <div className="border-y py-16 text-center text-muted-foreground"><Images className="mx-auto mb-3 size-8 text-warning" />No slides yet.</div>
              ) : (
                <div className="grid gap-3">
                  {slides.data.map((s) => (
                    <div key={s.id} className="card-lift flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
                      <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md bg-muted">{s.image_url && <img src={s.image_url} alt="" className="size-full object-cover" />}</div>
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.title}</p><p className="text-sm text-muted-foreground">Order {s.sort_order} · {s.is_active ? (s.ends_at && Date.parse(s.ends_at) <= Date.now() ? "Expired" : "Visible") : "Hidden"}{s.video_url ? " · Video loop" : ""}</p>{s.ends_at && <p className="text-xs text-muted-foreground">Ends {new Date(s.ends_at).toLocaleString()}</p>}</div>
                      <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} aria-label="Visible" />
                      <Button size="icon" variant="outline" aria-label="Edit" onClick={() => { setEditing(s); setOpen(true); }}><Pencil /></Button>
                      <Button size="icon" variant="outline" aria-label="Delete" onClick={() => remove(s)}><Trash2 /></Button>
                    </div>
                  ))}
                </div>
              )}
              {open && <SlideForm key={editing?.id ?? "new"} slide={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
              {can('analytics.view') && <div className="mt-10"><HeroSlideStats /></div>}
            </>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}

function SlideForm({ slide, onClose, onSaved }: { slide: HeroSlide | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(slide?.title ?? "");
  const [description, setDescription] = useState(slide?.description ?? "");
  const [imageUrl, setImageUrl] = useState(slide?.image_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState(slide?.video_url ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [limitedOffer, setLimitedOffer] = useState(!!slide?.ends_at);
  const [endsAt, setEndsAt] = useState(() => {
    if (!slide?.ends_at) return "";
    const date = new Date(slide.ends_at);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [buttonText, setButtonText] = useState(slide?.button_text ?? "");
  const [buttonUrl, setButtonUrl] = useState(slide?.button_url ?? "");
  const [order, setOrder] = useState(String(slide?.sort_order ?? 0));
  const [active, setActive] = useState(slide?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (buttonUrl.trim() && !safeSlideLink(buttonUrl.trim())) { toast.error("Use a website URL or a local /path for the button"); return; }
    if (limitedOffer && (!endsAt || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.now())) { toast.error("Choose a future offer end time"); return; }
    if (videoUrl.trim() && !/^https?:\/\//i.test(videoUrl.trim())) { toast.error("Use an http or https video URL"); return; }
    if (videoFile && !["video/mp4", "video/webm"].includes(videoFile.type)) { toast.error("Use an MP4 or WebM video"); return; }
    setSaving(true);
    try {
      const image_url = file ? await upload(file) : imageUrl.trim() || null;
      const video_url = videoFile ? await upload(videoFile) : videoUrl.trim() || null;
      const row = { title: title.trim(), description, image_url, video_url, ends_at: limitedOffer ? new Date(endsAt).toISOString() : null, button_text: buttonText.trim() || null, button_url: buttonUrl.trim() || null, sort_order: Number(order) || 0, is_active: active };
      const { error } = slide ? await supabase.from("hero_slides").update(row).eq("id", slide.id) : await supabase.from("hero_slides").insert(row);
      if (error) throw error;
      toast.success(slide ? "Slide updated" : "Slide added");
      onSaved();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{slide ? "Edit slide" : "Add slide"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="slide-title">Title</Label><Input id="slide-title" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="slide-description">Description</Label><Textarea id="slide-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="slide-image">Banner image / video poster</Label><Input id="slide-image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><Input aria-label="Banner image URL" placeholder="https://…" value={imageUrl} disabled={!!file} onChange={(e) => setImageUrl(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="slide-video">Loop video (MP4 / WebM)</Label><Input id="slide-video" type="file" accept="video/mp4,video/webm" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} /><Input aria-label="Video URL" placeholder="https://…" value={videoUrl} disabled={!!videoFile} onChange={(e) => setVideoUrl(e.target.value)} /></div>
          <div className="grid gap-3 border-y py-4"><div className="flex items-center justify-between"><Label htmlFor="limited-offer">Limited time offer</Label><Switch id="limited-offer" checked={limitedOffer} onCheckedChange={setLimitedOffer} /></div>{limitedOffer && <div className="grid gap-2"><Label htmlFor="offer-end">Offer ends (your local time)</Label><Input id="offer-end" type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="slide-button-text">Button text</Label><Input id="slide-button-text" placeholder="Learn more" value={buttonText} onChange={(e) => setButtonText(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="slide-button-link">Button link</Label><Input id="slide-button-link" placeholder="https://…" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="grid w-28 gap-2"><Label htmlFor="slide-order">Order</Label><Input id="slide-order" type="number" step="1" value={order} onChange={(e) => setOrder(e.target.value)} /></div>
            <label className="mt-6 flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> Visible</label>
          </div>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
