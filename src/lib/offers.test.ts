import { describe, it, expect } from "vitest";
import { bestOffer, discounted, offerStatus, type Offer } from "./offers";

const base = { id: "o1", title: "", badge_text: "", banner_text: "", show_banner: false, created_at: "", post_ids: [] as string[], starts_at: null, ends_at: null, is_active: true, discount_type: "percentage", discount_value: 50 } as Offer;
const now = Date.parse("2026-11-06T00:00:00Z");

describe("special offers", () => {
  it("50% off 500 is 250", () => expect(discounted(500, base)).toBe(250));
  it("fixed discount never goes below 0", () => expect(discounted(100, { discount_type: "fixed", discount_value: 150 })).toBe(0));
  it("expired offers do not apply", () => {
    const o = { ...base, ends_at: "2026-11-05T00:00:00Z" };
    expect(offerStatus(o, now)).toBe("Expired");
    expect(bestOffer("p", 500, [o], now)).toBeNull();
  });
  it("offer limited to other posts does not apply", () => expect(bestOffer("p", 500, [{ ...base, post_ids: ["x"] }], now)).toBeNull());
  it("picks the lowest price", () => expect(bestOffer("p", 500, [base, { ...base, id: "o2", discount_value: 80 }], now)?.price).toBe(100));
});
