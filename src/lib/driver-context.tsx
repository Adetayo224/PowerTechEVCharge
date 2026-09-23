"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
      const v = sessionStorage.getItem("plugspot.vehicle");
      if (v) setVehicleState({ ...DEFAULT_VEHICLE, ...JSON.parse(v) });
    } catch {}
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
