import { describe, expect, it } from "vitest";
import { bounceRate, isExpiredSession, SESSION_TIMEOUT_MS, ENGAGEMENT_MS } from "./analytics";

describe("Real analytics rules", () => {
  it("starts a new session after 30 minutes of inactivity", () => {
    expect(SESSION_TIMEOUT_MS).toBe(1_800_000);
    expect(isExpiredSession(0, 1_799_999)).toBe(false);
    expect(isExpiredSession(0, 1_800_000)).toBe(true);
  });
  it("does not invent a bounce rate while sessions are still active", () => {
    expect(bounceRate([{ views: 1, engaged: false, lastSeen: 100 }], 200)).toBeNull();
  });
  it("counts only completed unengaged single-page sessions as bounces", () => {
    expect(ENGAGEMENT_MS).toBe(10_000);
    expect(bounceRate([{ views: 1, engaged: false, lastSeen: 0 }, { views: 2, engaged: false, lastSeen: 0 }, { views: 1, engaged: true, lastSeen: 0 }, { views: 1, engaged: false, lastSeen: 0 }], 1_800_000)).toBe(50);
  });
});