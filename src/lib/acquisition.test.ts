import { describe, expect, it } from "vitest";
import { classifyAcquisition, referringOrigin } from "./acquisition";

const site = "https://postcraft-control-room.lovable.app";
describe("Real traffic acquisition", () => {
  it("counts an observed empty referrer as Direct", () => {
    expect(classifyAcquisition("", site)).toEqual({ channel: "Direct", source: null });
  });
  it("does not invent Direct attribution for unavailable data", () => {
    expect(classifyAcquisition(null, site).channel).toBe("Unknown");
    expect(classifyAcquisition("not a URL", site).channel).toBe("Unknown");
  });
  it("recognizes real search domains without matching lookalikes", () => {
    for (const host of ["www.google.com", "www.google.co.uk", "www.bing.com", "duckduckgo.com"]) {
      expect(classifyAcquisition(`https://${host}`, site).channel).toBe("Organic Search");
    }
    expect(classifyAcquisition("https://google.com.attacker.example", site).channel).toBe("Referral");
    expect(classifyAcquisition("https://accounts.google.com", site).channel).toBe("Unknown");
  });
  it("recognizes social referrers", () => {
    for (const host of ["l.facebook.com", "instagram.com", "t.co", "linkedin.com", "youtube.com"]) {
      expect(classifyAcquisition(`https://${host}`, site).channel).toBe("Social");
    }
  });
  it("records other external sites as Referral", () => {
    expect(classifyAcquisition("https://news.example.org", site)).toEqual({ channel: "Referral", source: "news.example.org" });
  });
  it("does not count internal navigation as Referral", () => {
    expect(classifyAcquisition(`${site}/analytics`, site).channel).toBe("Direct");
  });
  it("never transmits referrer paths, queries or credentials", () => {
    expect(referringOrigin("https://user:pass@news.example.org/private?email=private#fragment")).toBe("https://news.example.org");
    expect(referringOrigin("javascript:alert(1)")).toBeNull();
  });
});