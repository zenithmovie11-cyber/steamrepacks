export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const ENGAGEMENT_MS = 10_000;

export function isExpiredSession(lastActivity: number, now: number) {
  return now - lastActivity >= SESSION_TIMEOUT_MS;
}

export function bounceRate(sessions: { views: number; engaged: boolean; lastSeen: number }[], now: number) {
  const completed = sessions.filter((s) => isExpiredSession(s.lastSeen, now));
  return completed.length ? Math.round(completed.filter((s) => s.views <= 1 && !s.engaged).length / completed.length * 1000) / 10 : null;
}

export type AnalyticsData = {
  visitors: number; sessions: number; pageviews: number; bounce_rate: number | null; live: number;
  tracking_since: string | null;
  daily: { day: string; visitors: number; pageviews: number }[];
  locations: { country: string; city: string; count: number }[];
  devices: Breakdown[]; browsers: Breakdown[]; operating_systems: Breakdown[]; pages: Breakdown[];
  acquisition_since: string | null;
  channels: Breakdown[];
  referrers: Breakdown[];
};
export type Breakdown = { name: string; count: number };