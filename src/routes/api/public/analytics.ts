import { createFileRoute } from "@tanstack/react-router";
import Bowser from "bowser";
import { z } from "zod";
import { classifyAcquisition } from "@/lib/acquisition";

const eventSchema = z.object({
  session: z.string().uuid(), visitor: z.string().uuid(), view: z.string().uuid().nullable(),
  path: z.string().max(500).regex(/^\/(?!\/)[^?#]*$/), engaged: z.boolean(),
  referrer: z.string().max(300).nullable().optional(),
});

export const Route = createFileRoute("/api/public/analytics")({
  server: { handlers: { POST: async ({ request }) => {
    const origin = request.headers.get("origin");
    if (origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
      return new Response(null, { status: 403 });
    }
    if (Number(request.headers.get("content-length") ?? 0) > 2048) return new Response(null, { status: 413 });
    const text = await request.text();
    if (text.length > 2048) return new Response(null, { status: 413 });
    let input: unknown;
    try { input = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) return new Response(null, { status: 400 });
    // Geolocation is trusted hosting metadata, never supplied by the browser.
    const cf = (request as Request & { cf?: { country?: string; city?: string } }).cf;
    const ua = request.headers.get("user-agent") ?? "";
    if (/bot|crawler|spider|headless/i.test(ua)) return new Response(null, { status: 204 });
    const tech = Bowser.parse(ua);
    const data = parsed.data;
    const acquisition = classifyAcquisition(data.referrer ?? null, new URL(request.url).origin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_analytics_acquisition", {
      // PostgreSQL accepts NULL for heartbeat events; generated RPC types omit argument nullability.
      p_session: data.session, p_visitor: data.visitor, p_view: data.view as unknown as string,
      p_path: data.path, p_engaged: data.engaged,
      p_country: cf?.country || "Unknown", p_city: cf?.city || "Unknown",
      p_device: tech.platform.type || "Unknown", p_browser: tech.browser.name || "Unknown", p_os: tech.os.name || "Unknown",
      p_channel: acquisition.channel, p_source: acquisition.source ?? "",
    });
    return new Response(null, { status: error ? 503 : 204, headers: { "Cache-Control": "no-store" } });
  } } },
});