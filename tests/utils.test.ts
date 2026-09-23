import { describe, it, expect } from "vitest";
import { formatNaira, pricePerKwh, haversineKm, randomReference } from "@/lib/utils";

describe("utils", () => {
  it("formats Naira", () => {
    expect(formatNaira(1234)).toBe("₦1,234");
    expect(pricePerKwh(250)).toBe("₦250/kWh");
  });
  it("computes haversine distance", () => {
    const lagos = { lat: 6.5244, lng: 3.3792 };
    const abuja = { lat: 9.0765, lng: 7.4666 };
    const km = haversineKm(lagos, abuja);
    expect(km).toBeGreaterThan(500);
    expect(km).toBeLessThan(700);
  });
  it("generates an 8 character reference", () => {
    const r = randomReference();
    expect(r).toMatch(/^[A-Z2-9]{8}$/);
  });
});
