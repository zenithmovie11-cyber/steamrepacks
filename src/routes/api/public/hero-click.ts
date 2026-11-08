import { createFileRoute } from "@tanstack/react-router";
import { slideClickSchema } from "@/lib/hero-slides";

export const Route = createFileRoute("/api/public/hero-click")({
  server: { handlers: { POST: async ({ request }) => {
    if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 512) return new Response(null, { status: 413 });
    const body = await request.text();
    if (body.length > 512) return new Response(null, { status: 413 });
    let input: unknown;
    try { input = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
    const parsed = slideClickSchema.safeParse(input);
    if (!parsed.success) return new Response(null, { status: 400 });
    if (/bot|crawler|spider|headless/i.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_hero_slide_click", { p_id: parsed.data.id, p_slide: parsed.data.slide, p_session: parsed.data.session });
    return new Response(null, { status: error ? 503 : 204, headers: { "Cache-Control": "no-store" } });
  } } },
});