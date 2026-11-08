import type { Database } from "@/integrations/supabase/types";

export type Post = Database["public"]["Tables"]["posts"]["Row"];

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
