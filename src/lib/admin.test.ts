import { describe, it, expect } from "vitest";
import { isAdminEmail } from "./admin";

describe("isAdminEmail", () => {
  it("allows the three admin emails", () => {
    expect(isAdminEmail("noorasadbd@gmail.com")).toBe(true);
    expect(isAdminEmail("ZenithGtaStore@gmail.com")).toBe(true);
    expect(isAdminEmail("ramim980124@gmail.com")).toBe(true);
  });
  it("treats anyone else as guest", () => {
    expect(isAdminEmail("someone@gmail.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});
