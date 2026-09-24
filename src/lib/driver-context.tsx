"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export type DriverLocation = { lng: number; lat: number; bearing?: number };
export type DriverVehicle = {
  model: string;
  batteryPercent: number;
  batteryKwh: number;
  efficiencyKmPerKwh: number;
  targetPercent: number;
};

type Ctx = {
  location: DriverLocation | null;
  setLocation: (l: DriverLocation | null) => void;
  vehicle: DriverVehicle;
  setVehicle: (v: DriverVehicle) => void;
  rangeKm: number;
};

const DEFAULT_VEHICLE: DriverVehicle = {
  model: "Hyundai Kona Electric",
  batteryPercent: 42,
  batteryKwh: 64,
  efficiencyKmPerKwh: 5.6,
  targetPercent: 80,
};

const DriverCtx = createContext<Ctx | null>(null);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<DriverLocation | null>(null);
  const [vehicle, setVehicleState] = useState<DriverVehicle>(DEFAULT_VEHICLE);

  useEffect(() => {
    try {
      const l = sessionStorage.getItem("plugspot.location");
      if (l) setLocationState(JSON.parse(l));
    } catch {}
    // Load vehicle from the driver's profile so it reflects saved settings.
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("car_model, battery_kwh, efficiency_km_per_kwh, battery_percent, target_percent")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return;
      const merged: DriverVehicle = {
        model: data.car_model || DEFAULT_VEHICLE.model,
        batteryKwh: Number(data.battery_kwh) || DEFAULT_VEHICLE.batteryKwh,
        efficiencyKmPerKwh: Number(data.efficiency_km_per_kwh) || DEFAULT_VEHICLE.efficiencyKmPerKwh,
        batteryPercent: typeof data.battery_percent === "number" ? data.battery_percent : DEFAULT_VEHICLE.batteryPercent,
        targetPercent: typeof data.target_percent === "number" ? data.target_percent : DEFAULT_VEHICLE.targetPercent,
      };
      setVehicleState(merged);
    })();
  }, []);

  const setLocation = useCallback((l: DriverLocation | null) => {
    setLocationState(l);
    try {
      if (l) sessionStorage.setItem("plugspot.location", JSON.stringify(l));
      else sessionStorage.removeItem("plugspot.location");
    } catch {}
  }, []);

  const setVehicle = useCallback((v: DriverVehicle) => {
    setVehicleState(v);
    try { sessionStorage.setItem("plugspot.vehicle", JSON.stringify(v)); } catch {}
  }, []);

  const rangeKm = useMemo(() => {
    return Math.round((vehicle.batteryKwh * vehicle.batteryPercent / 100) * vehicle.efficiencyKmPerKwh);
  }, [vehicle]);

  return (
    <DriverCtx.Provider value={{ location, setLocation, vehicle, setVehicle, rangeKm }}>
      {children}
    </DriverCtx.Provider>
  );
}

export function useDriver() {
  const c = useContext(DriverCtx);
  if (!c) throw new Error("useDriver must be inside DriverProvider");
  return c;
}
