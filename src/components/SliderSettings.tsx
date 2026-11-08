import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sliderDefaults, type SliderSettings as Settings } from "@/lib/hero-slides";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SliderSettings() {
  const query = useQuery({ queryKey: ["hero-slider-settings"], queryFn: async () => {
    const { data, error } = await supabase.from("hero_slider_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data ?? sliderDefaults;
  } });
  if (query.isPending) return <Loader2 className="size-5 animate-spin" />;
  if (query.error) return <p role="alert">Settings could not load. <Button variant="link" onClick={() => query.refetch()}>Retry</Button></p>;
  return <SettingsForm key={query.dataUpdatedAt} initial={query.data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("hero_slider_settings").upsert(settings);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Slider settings saved");
    void qc.invalidateQueries({ queryKey: ["hero-slider-settings"] });
  }
  const toggles = [["autoplay", "Autoplay"], ["pause_on_hover", "Pause on hover"], ["loop", "Loop slides"], ["show_arrows", "Navigation arrows"], ["show_dots", "Pagination dots"]] as const;
  return <section className="mb-8 border-y py-6">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="size-5 text-primary" />Slider settings</h2><Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save settings</Button></div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="grid gap-2"><Label htmlFor="slider-speed">Autoplay interval</Label><Select value={String(settings.interval_ms)} onValueChange={(v) => setSettings({ ...settings, interval_ms: Number(v) })}><SelectTrigger id="slider-speed"><SelectValue /></SelectTrigger><SelectContent>{[3, 5, 8].map((s) => <SelectItem key={s} value={String(s * 1000)}>{s} seconds</SelectItem>)}</SelectContent></Select></div>
      {toggles.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-4"><Label htmlFor={`slider-${key}`}>{label}</Label><Switch id={`slider-${key}`} checked={settings[key]} onCheckedChange={(v) => setSettings({ ...settings, [key]: v })} /></div>)}
    </div>
  </section>;
}