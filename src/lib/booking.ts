import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const LAGOS_TZ = "Africa/Lagos";
export const SLOT_MINUTES = 30;

export function alignToSlot(d: Date): Date {
  const out = new Date(d);
  out.setSeconds(0, 0);
  out.setMinutes(out.getMinutes() >= 30 ? 30 : 0);
  return out;
}

export function isAlignedToSlot(d: Date): boolean {
  return d.getSeconds() === 0 && d.getMilliseconds() === 0 && (d.getMinutes() === 0 || d.getMinutes() === 30);
}

export type AvailabilityWindow = { weekday: number; open_time: string; close_time: string };
export type TakenSlot = { start: Date; end: Date };

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function generateSlotsForDate(opts: {
  date: Date;
  availability: AvailabilityWindow[];
  taken: TakenSlot[];
  now?: Date;
}): { start: Date; end: Date; available: boolean; reason?: "taken" | "past" }[] {
  const now = opts.now ?? new Date();
  const zoned = toZonedTime(opts.date, LAGOS_TZ);
  const weekday = zoned.getDay();
  const windows = opts.availability.filter((w) => w.weekday === weekday);
  if (!windows.length) return [];
  const results: { start: Date; end: Date; available: boolean; reason?: "taken" | "past" }[] = [];
  for (const w of windows) {
    const startMin = hhmmToMinutes(w.open_time);
    const endMin = hhmmToMinutes(w.close_time);
    for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
      const dateStr = formatInTimeZone(opts.date, LAGOS_TZ, "yyyy-MM-dd");
      const h = Math.floor(m / 60).toString().padStart(2, "0");
      const mm = (m % 60).toString().padStart(2, "0");
      const iso = new Date(`${dateStr}T${h}:${mm}:00+01:00`);
      const end = new Date(iso.getTime() + SLOT_MINUTES * 60 * 1000);
      const isPast = iso <= now;
      const isTaken = opts.taken.some((t) => t.start.getTime() < end.getTime() && t.end.getTime() > iso.getTime());
      results.push({ start: iso, end, available: !isPast && !isTaken, reason: isPast ? "past" : isTaken ? "taken" : undefined });
    }
  }
  return results;
}

export function estimateBookingCost(powerKw: number, pricePerKwh: number): { kwh: number; cost: number } {
  const kwh = Number((powerKw * 0.5).toFixed(2));
  const cost = Number((kwh * pricePerKwh).toFixed(2));
  return { kwh, cost };
}

export function formatSlot(d: Date): string {
  return formatInTimeZone(d, LAGOS_TZ, "HH:mm");
}

export function formatSlotLong(d: Date): string {
  return formatInTimeZone(d, LAGOS_TZ, "EEE, dd MMM · HH:mm");
}
