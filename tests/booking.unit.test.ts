import { describe, it, expect } from "vitest";
import { alignToSlot, estimateBookingCost, generateSlotsForDate, isAlignedToSlot, SLOT_MINUTES } from "@/lib/booking";

describe("booking utils", () => {
  it("aligns a date to the previous 30 minute boundary", () => {
    const d = new Date("2026-09-23T10:12:34Z");
    const a = alignToSlot(new Date(d));
    expect(isAlignedToSlot(a)).toBe(true);
  });

  it("estimates cost for a 30 minute slot", () => {
    const { kwh, cost } = estimateBookingCost(60, 250);
    expect(kwh).toBe(30);
    expect(cost).toBe(7500);
  });

  it("generates slots inside operating hours only", () => {
    const date = new Date("2026-09-23T00:00:00+01:00");
    const weekday = new Date("2026-09-23T00:00:00+01:00").getDay();
    const slots = generateSlotsForDate({
      date,
      availability: [{ weekday, open_time: "06:00", close_time: "22:00" }],
      taken: [],
      now: new Date("2026-09-23T05:00:00+01:00"),
    });
    const expected = ((22 - 6) * 60) / SLOT_MINUTES;
    expect(slots.length).toBe(expected);
    expect(slots.every((s) => !s.reason)).toBe(true);
  });

  it("marks past slots unavailable", () => {
    const date = new Date("2026-09-23T00:00:00+01:00");
    const weekday = date.getDay();
    const slots = generateSlotsForDate({
      date,
      availability: [{ weekday, open_time: "06:00", close_time: "22:00" }],
      taken: [],
      now: new Date("2026-09-23T09:15:00+01:00"),
    });
    const past = slots.filter((s) => s.reason === "past");
    expect(past.length).toBeGreaterThan(0);
    expect(past.every((s) => !s.available)).toBe(true);
  });

  it("marks overlapping taken slots as taken", () => {
    const date = new Date("2026-09-23T00:00:00+01:00");
    const weekday = date.getDay();
    const takenStart = new Date("2026-09-23T09:00:00+01:00");
    const takenEnd = new Date("2026-09-23T09:30:00+01:00");
    const slots = generateSlotsForDate({
      date,
      availability: [{ weekday, open_time: "06:00", close_time: "22:00" }],
      taken: [{ start: takenStart, end: takenEnd }],
      now: new Date("2026-09-23T05:00:00+01:00"),
    });
    const nine = slots.find((s) => s.start.getTime() === takenStart.getTime());
    expect(nine?.available).toBe(false);
    expect(nine?.reason).toBe("taken");
  });

  it("returns empty when the weekday has no availability window", () => {
    const date = new Date("2026-09-23T00:00:00+01:00");
    const slots = generateSlotsForDate({
      date, availability: [], taken: [], now: new Date("2026-09-23T00:00:00+01:00"),
    });
    expect(slots.length).toBe(0);
  });
});
