import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Offer = Database["public"]["Tables"]["special_offers"]["Row"];
export const offersKey = ["special-offers"] as const;

export function offerStatus(o: Pick<Offer, "is_active" | "starts_at" | "ends_at">, now: number) {
  if (!o.is_active) return "Paused";
  if (o.ends_at && Date.parse(o.ends_at) <= now) return "Expired";
  if (o.starts_at && Date.parse(o.starts_at) > now) return "Scheduled";
  return "Active";
}

export function discounted(price: number, o: Pick<Offer, "discount_type" | "discount_value">) {
  const v = Number(o.discount_value);
  const off = o.discount_type === "percentage" ? (price * v) / 100 : v;
  return Math.max(0, Math.round((price - off) * 100) / 100);
}

/** Lowest price among live offers that apply to this post (empty post list = all paid posts). */
export function bestOffer(postId: string, price: number, offers: Offer[], now: number) {
  let best: { offer: Offer; price: number } | null = null;
  for (const o of offers) {
    if (offerStatus(o, now) !== "Active") continue;
    if (o.post_ids.length && !o.post_ids.includes(postId)) continue;
    const p = discounted(price, o);
    if (p < price && (!best || p < best.price)) best = { offer: o, price: p };
  }
  return best;
}

export function useOffers() {
  return useQuery({
    queryKey: offersKey,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("special_offers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
