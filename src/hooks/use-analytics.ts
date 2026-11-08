import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ENGAGEMENT_MS, isExpiredSession } from "@/lib/analytics";
import { referringOrigin } from "@/lib/acquisition";

export function useAnalytics() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (path.startsWith("/api/")) return;
    let visitor: string;
    try {
      visitor = localStorage.getItem("analytics_visitor") || crypto.randomUUID();
      localStorage.setItem("analytics_visitor", visitor);
    } catch { return; }
    let view = crypto.randomUUID();
    let pageVisibleMs = 0;
    let lastTick = Date.now();
    let initial = true;
    const send = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible") { lastTick = now; return; }
      pageVisibleMs += Math.min(now - lastTick, 15_000);
      lastTick = now;
      try {
        let session = sessionStorage.getItem("analytics_session");
        const previous = Number(sessionStorage.getItem("analytics_activity") || 0);
        const expired = !session || isExpiredSession(previous, now);
        if (expired) {
          session = crypto.randomUUID();
          view = crypto.randomUUID();
          pageVisibleMs = 0;
        }
        if (!session) return;
        sessionStorage.setItem("analytics_session", session);
        sessionStorage.setItem("analytics_activity", String(now));
        void fetch("/api/public/analytics", {
          method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ visitor, session, view: initial || expired ? view : null, path, engaged: pageVisibleMs >= ENGAGEMENT_MS, referrer: expired ? referringOrigin(initial ? document.referrer : "") : null }),
        }).catch(() => {});
        initial = false;
      } catch { /* Storage may be disabled. Do not fabricate a visitor identity. */ }
    };
    send();
    const timer = setInterval(send, ENGAGEMENT_MS);
    document.addEventListener("visibilitychange", send);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", send); };
  }, [path]);
}