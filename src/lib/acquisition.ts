export type TrafficChannel = "Direct" | "Organic Search" | "Social" | "Referral" | "Unknown";
export type Acquisition = { channel: TrafficChannel; source: string | null };

const searchHosts = ["bing.com", "yahoo.com", "duckduckgo.com", "baidu.com", "yandex.com", "yandex.ru", "ecosia.org", "search.brave.com"];
const socialHosts = ["facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com", "t.co", "linkedin.com", "lnkd.in", "reddit.com", "pinterest.com", "youtube.com", "youtu.be", "tiktok.com", "threads.net", "threads.com", "t.me", "telegram.org", "snapchat.com", "whatsapp.com"];
const matchesHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

// Only the referring origin is transmitted: never its path, query or credentials.
export function referringOrigin(referrer: string): string | null {
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}

export function classifyAcquisition(referrer: string | null, siteOrigin: string): Acquisition {
  if (referrer === null) return { channel: "Unknown", source: null };
  if (referrer === "") return { channel: "Direct", source: null };
  try {
    const url = new URL(referrer);
    if (!["http:", "https:"].includes(url.protocol)) return { channel: "Unknown", source: null };
    if (url.origin === siteOrigin) return { channel: "Direct", source: null };
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    // Identity-provider callbacks are not organic search visits.
    if (host === "accounts.google.com") return { channel: "Unknown", source: null };
    const google = /^(?:[a-z0-9-]+\.)*google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host);
    const channel = google || searchHosts.some((domain) => matchesHost(host, domain))
      ? "Organic Search"
      : socialHosts.some((domain) => matchesHost(host, domain)) ? "Social" : "Referral";
    return { channel, source: host };
  } catch { return { channel: "Unknown", source: null }; }
}