import "./lib/error-capture";
import { botSignal, shouldInspect } from "./lib/ip-security";

// Only Cloudflare-edge requests (request.cf present) carry a trustworthy cf-connecting-ip.
async function firewall(request: Request): Promise<Response | null> {
  const cf = (request as Request & { cf?: { country?: string; asOrganization?: string; asn?: number } }).cf;
  const ip = request.headers.get("cf-connecting-ip");
  if (!cf || !ip || !shouldInspect(request)) return null;
  try {
    const { supabaseAdmin } = await import("./integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("enforce_ip_security", {
      p_ip: ip,
      p_path: new URL(request.url).pathname,
      p_country: cf.country ?? "Unknown",
      p_asn: cf.asOrganization ? `AS${cf.asn ?? ""} ${cf.asOrganization}` : null,
      p_bot_signal: botSignal(request.headers.get("user-agent")),
    } as never);
    if (data === "rate_limited") return new Response("Too many requests", { status: 429, headers: { "retry-after": "60" } });
    if (data === "blocked" || data === "bot_blocked") return new Response("Access denied by firewall", { status: 403 });
  } catch (error) {
    console.error("firewall check failed", error);
  }
  return null;
}

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const denied = await firewall(request);
      if (denied) return denied;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
