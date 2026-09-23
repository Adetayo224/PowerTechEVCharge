import type { Charger } from "@/lib/supabase/types";

export type ChargerState = {
  charger_id: string;
  in_use: boolean;
  session_started_at: string | null;
  session_ends_at: string | null;
  waiting: number;
  updated_at: string;
};

export function chargerFreeInMinutes(state: ChargerState | undefined): number {
  if (!state) return 0;
  if (!state.in_use || !state.session_ends_at) return 0;
  const end = new Date(state.session_ends_at).getTime();
  const now = Date.now();
  return Math.max(0, (end - now) / 60000);
}

export function estimatedWaitMinutes(
  chargers: Charger[],
  states: Record<string, ChargerState>,
): number {
  const online = chargers.filter((c) => c.status === "online");
  if (online.length === 0) return Infinity;
  const perCharger = online.map((c) => {
    const s = states[c.id];
    if (!s || !s.in_use) return 0;
    const freeIn = chargerFreeInMinutes(s);
    const queueMinutes = (s.waiting ?? 0) * averageSessionMinutes(c);
    return freeIn + queueMinutes;
  });
  return Math.min(...perCharger);
}

export function averageSessionMinutes(c: Charger): number {
  return Math.max(15, Math.min(60, Math.round(60 / Math.max(c.power_kw / 30, 1))));
}

export function chargingMinutes(
  batteryPercent: number,
  targetPercent: number,
  batteryKwh: number,
  powerKw: number,
): number {
  const delta = Math.max(0, targetPercent - batteryPercent);
  const kwh = (delta / 100) * batteryKwh;
  const efficiency = 0.9;
  return Math.round((kwh / (powerKw * efficiency)) * 60);
}

export function summariseWaiting(states: ChargerState[] | undefined): number {
  if (!states) return 0;
  return states.reduce((n, s) => n + (s.waiting ?? 0), 0);
}
