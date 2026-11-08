import { describe, it, expect } from "vitest";
import { isSlideVisible, countdown, safeSlideLink, slideClickSchema, sliderDefaults } from "./hero-slides";

describe("hero slide rules", () => {
  it("hides offers at and after their deadline", () => {
    const slide = { is_active: true, ends_at: "2026-11-01T06:00:00Z" };
    expect(isSlideVisible(slide, Date.parse("2026-11-01T05:59:59Z"))).toBe(true);
    expect(isSlideVisible(slide, Date.parse(slide.ends_at))).toBe(false);
    expect(isSlideVisible(slide, Date.parse("2026-11-01T06:00:01Z"))).toBe(false);
  });
  it("never displays hidden slides", () => expect(isSlideVisible({ is_active: false, ends_at: null }, 0)).toBe(false));
  it("does not expire ordinary slides", () => expect(isSlideVisible({ is_active: true, ends_at: null }, Date.now())).toBe(true));
  it("counts down without negative time", () => {
    expect(countdown("2026-11-02T07:02:03Z", Date.parse("2026-11-01T06:00:00Z"))).toBe("1d 01:02:03");
    expect(countdown("2026-11-01T05:00:00Z", Date.parse("2026-11-01T06:00:00Z"))).toBe("00:00:00");
  });
  it("rejects executable and protocol-relative button URLs", () => {
    expect(safeSlideLink("javascript:alert(1)")).toBeNull();
    expect(safeSlideLink("//example.org")).toBeNull();
    expect(safeSlideLink("/\\example.org")).toBeNull();
    expect(safeSlideLink("/library")).toBe("/library");
    expect(safeSlideLink("https://example.org/offer")).toBe("https://example.org/offer");
  });
  it("requires valid click identities", () => expect(slideClickSchema.safeParse({ id: "fake", slide: "fake", session: "fake" }).success).toBe(false));
  it("defaults to five-second looping playback", () => {
    expect(sliderDefaults.interval_ms).toBe(5000);
    expect(sliderDefaults.loop).toBe(true);
  });
});