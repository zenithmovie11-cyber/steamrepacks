import { z } from "zod";

export const sliderDefaults = { id: 1, autoplay: true, interval_ms: 5000, show_arrows: true, show_dots: true, pause_on_hover: true, loop: true };
export type SliderSettings = typeof sliderDefaults;
export const slideClickSchema = z.object({ id: z.string().uuid(), slide: z.string().uuid(), session: z.string().uuid() }).strict();
export function isSlideVisible(slide: { is_active: boolean; ends_at: string | null }, now: number) {
  return slide.is_active && (!slide.ends_at || Date.parse(slide.ends_at) > now);
}
export function countdown(endsAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 1000));
  const days = Math.floor(seconds / 86400);
  return `${days ? `${days}d ` : ""}${String(Math.floor(seconds / 3600) % 24).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function safeSlideLink(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function recordSlideClick(slide: string) {
  try {
    const session = sessionStorage.getItem("analytics_session");
    if (!session) return;
    void fetch("/api/public/hero-click", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ id: crypto.randomUUID(), slide, session }) }).catch(() => {});
  } catch { /* No identity is invented when browser storage is unavailable. */ }
}