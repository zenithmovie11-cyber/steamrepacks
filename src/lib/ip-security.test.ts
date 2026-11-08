import { describe, expect, it } from "vitest";
import { botSignal, normalizeNetwork } from "./ip-security";

describe("ip security", () => {
  it("flags scripted clients as bad bots", () => expect(botSignal("python-requests/2.31")).toBe("bad:python-requests"));
  it("recognises search crawlers as good bots", () => expect(botSignal("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("good:googlebot"));
  it("treats normal browsers as clean", () => expect(botSignal("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36")).toBeNull());
  it("accepts IPs and CIDR ranges", () => {
    expect(normalizeNetwork("203.0.113.0/24")).toBe("203.0.113.0/24");
    expect(normalizeNetwork("2001:db8::1")).toBe("2001:db8::1");
  });
  it("rejects invalid addresses", () => expect(normalizeNetwork("999.1.1.1")).toBeNull());
});
