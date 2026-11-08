import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { useOffers, offerStatus } from "@/lib/offers";
import { countdown } from "@/lib/hero-slides";

export function OfferBanner() {
  const { data = [] } = useOffers();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const live = data.filter((o) => o.show_banner && o.banner_text && offerStatus(o, now) === "Active");
  if (!live.length) return null;
  return (
    <div className="mb-6 space-y-2">
      {live.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Megaphone className="size-4 shrink-0 text-primary" />
          <span className="flex-1 font-medium">{o.banner_text}</span>
          {o.ends_at && <span className="rounded-md bg-card px-2 py-1 font-mono text-xs tabular-nums">Ends in {countdown(o.ends_at, now)}</span>}
        </div>
      ))}
    </div>
  );
}
