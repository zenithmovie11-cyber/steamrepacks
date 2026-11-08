import { useSyncExternalStore } from "react";

const KEY = "monolith_cart";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { cache = []; }
  if (!Array.isArray(cache)) cache = [];
  return cache;
}
function write(ids: string[]) {
  cache = ids;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}
const empty: string[] = [];

export function useCart() {
  const ids = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => empty);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    add: (id: string) => { if (!ids.includes(id)) write([...ids, id]); },
    remove: (id: string) => write(ids.filter((x) => x !== id)),
    clear: () => write([]),
  };
}

export function parsePrice(price: string | null) {
  const n = parseFloat((price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
