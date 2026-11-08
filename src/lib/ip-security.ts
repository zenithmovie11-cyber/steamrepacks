import ipaddr from "ipaddr.js";

const goodBots = /(googlebot|bingbot|duckduckbot|yandexbot|baiduspider|applebot|facebookexternalhit|twitterbot|linkedinbot|slurp)/i;
const badBots = /(python-requests|curl\/|wget|scrapy|httpclient|go-http-client|headlesschrome|phantomjs|libwww|okhttp|masscan|zgrab|nikto|sqlmap)/i;

/** Classifies a user agent: "good:<name>", "bad:<name>", or null for normal browsers. */
export function botSignal(ua: string | null): string | null {
  if (!ua || !ua.trim()) return "bad:empty-agent";
  const good = ua.match(goodBots);
  if (good) return `good:${(good[1] ?? "bot").toLowerCase()}`;
  const bad = ua.match(badBots);
  if (bad) return `bad:${(bad[1] ?? "bot").toLowerCase().replace("/", "")}`;
  return null;
}

/** Validates a single IP or CIDR range and returns its normalized form, or null. */
export function normalizeNetwork(input: string): string | null {
  const value = input.trim();
  try {
    if (value.includes("/")) {
      const [addr, bits] = ipaddr.parseCIDR(value);
      return `${addr.toString()}/${bits}`;
    }
    return ipaddr.parse(value).toString();
  } catch {
    return null;
  }
}

/** Requests worth checking: page loads and public API calls, not static assets. */
export function shouldInspect(request: Request): boolean {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/public/")) return true;
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname) || url.pathname.startsWith("/_") || url.pathname.startsWith("/@")) return false;
  return request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
}
