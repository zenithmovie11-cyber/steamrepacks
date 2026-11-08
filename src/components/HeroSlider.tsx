import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Pause, Play, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { countdown, isSlideVisible, recordSlideClick, safeSlideLink, sliderDefaults } from "@/lib/hero-slides";

export type HeroSlide = Tables<"hero_slides">;
export const heroSlidesKey = ["hero-slides"];

export function HeroSlider() {
  const { data = [] } = useQuery({ queryKey: [...heroSlidesKey, "active"], refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.from("hero_slides").select("*").eq("is_active", true).order("sort_order").order("created_at");
    if (error) throw error;
    return data;
  } });
  const { data: settings = sliderDefaults } = useQuery({ queryKey: ["hero-slider-settings"], refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.from("hero_slider_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data ?? sliderDefaults;
  } });
  const [now, setNow] = useState(Date.now());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [index, setIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const slides = useMemo(() => data.filter((s) => isSlideVisible(s, now)), [data, now]);
  const [ref, api] = useEmblaCarousel({ loop: settings.loop });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    motion(); visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => { clearInterval(timer); media.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (!api) return;
    const selected = () => { setIndex(api.selectedScrollSnap()); setCanPrev(api.canScrollPrev()); setCanNext(api.canScrollNext()); };
    api.on("select", selected).on("reInit", selected); selected();
    return () => { api.off("select", selected).off("reInit", selected); };
  }, [api]);
  const stopped = paused || focused || hidden || reduced || (settings.pause_on_hover && hovered);
  useEffect(() => {
    if (!api || slides.length < 2 || !settings.autoplay || stopped) return;
    const timer = setInterval(() => { if (api.canScrollNext()) api.scrollNext(); }, settings.interval_ms);
    return () => clearInterval(timer);
  }, [api, slides.length, settings.autoplay, settings.interval_ms, stopped]);
  if (!slides.length) return null;
  return <section className="relative mb-8 overflow-hidden rounded-lg border bg-muted" aria-label="Featured content" aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <div ref={ref} className="overflow-hidden"><div className="flex">
      {slides.map((slide, k) => {
        const link = slide.button_url ? safeSlideLink(slide.button_url) : null;
        return <div key={slide.id} className="relative flex min-w-0 shrink-0 basis-full flex-col" role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${slides.length}`} aria-hidden={k !== index} inert={k !== index}>
          {(slide.image_url || slide.video_url) && <div className="relative aspect-video w-full bg-muted">
            {slide.image_url && <img src={slide.image_url} alt="" className="absolute inset-0 size-full object-contain" />}
            {slide.video_url && <SlideVideo url={slide.video_url} poster={slide.image_url ?? undefined} active={k === index && !stopped} />}
          </div>}
          <div className="relative flex w-full flex-col gap-2 border-t bg-hero-caption px-12 pt-5 pb-12 text-foreground sm:px-16">
            {slide.ends_at && <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-primary"><Timer className="size-4" />Limited time offer <span className="tabular-nums">{countdown(slide.ends_at, now)}</span></p>}
            <h2 className="break-words text-2xl font-semibold sm:text-3xl">{slide.title}</h2>
            {slide.description && <p className="line-clamp-3 break-words text-sm sm:text-base">{slide.description}</p>}
            {link && <Button asChild className="mt-1 w-fit max-w-full whitespace-normal"><a href={link} target={link.startsWith("/") ? undefined : "_blank"} rel="noreferrer" onClick={() => recordSlideClick(slide.id)}>{slide.button_text || "Learn more"}</a></Button>}
          </div>
        </div>;
      })}
    </div></div>
    {slides.length > 1 && settings.show_arrows && <><Button size="icon" variant="secondary" aria-label="Previous slide" title="Previous slide" disabled={!canPrev} className="absolute top-1/2 left-2 -translate-y-1/2" onClick={() => api?.scrollPrev()}><ChevronLeft /></Button><Button size="icon" variant="secondary" aria-label="Next slide" title="Next slide" disabled={!canNext} className="absolute top-1/2 right-2 -translate-y-1/2" onClick={() => api?.scrollNext()}><ChevronRight /></Button></>}
    {slides.length > 1 && settings.show_dots && <div className="absolute bottom-3 left-1/2 flex max-w-[75%] -translate-x-1/2 flex-wrap justify-center">{slides.map((s, k) => <Button key={s.id} size="icon" variant="ghost" className="size-7" aria-label={`Slide ${k + 1}`} aria-pressed={index === k} onClick={() => api?.scrollTo(k)}><span className={`h-2 w-2 rounded-full bg-primary ${index === k ? "opacity-100" : "opacity-40"}`} /></Button>)}</div>}
    {settings.autoplay && slides.length > 1 && <Button size="icon" variant="secondary" className="absolute right-3 bottom-3" aria-label={paused ? "Resume slideshow" : "Pause slideshow"} title={paused ? "Resume slideshow" : "Pause slideshow"} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>}
  </section>;
}

function SlideVideo({ url, poster, active }: { url: string; poster: string | undefined; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) void video.play().catch(() => {}); else video.pause();
  }, [active, url]);
  if (failed) return null;
  return <video ref={ref} src={url} poster={poster} muted loop playsInline preload="metadata" className="absolute inset-0 size-full object-contain" onError={() => setFailed(true)} />;
}
