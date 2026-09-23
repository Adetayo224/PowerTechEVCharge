"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Locate, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button, Card, Skeleton } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import type { Charger, Station } from "@/lib/supabase/types";
import { pricePerKwh } from "@/lib/utils";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

type St = Station & { chargers?: Charger[] };

export default function DriverMap() {
  const [stations, setStations] = useState<St[] | null>(null);
  const [selected, setSelected] = useState<St | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    fetch("/api/stations").then((r) => r.json()).then((d) => setStations(d.stations ?? []));
  }, []);

  const availableCount = useMemo(() =>
    (stations ?? []).reduce((n, s) => n + ((s.chargers ?? []).some((c) => c.status === "online") ? 1 : 0), 0),
  [stations]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCenter({ lat: 6.5244, lng: 3.3792 }),
      { timeout: 5000 }
    );
  }

  return (
    <div className="relative h-dvh">
      <div className="absolute inset-0">
        {stations === null ? <Skeleton className="h-full w-full" /> : <LeafletMap stations={stations} center={center} onStationClick={setSelected} />}
      </div>

      <div className="pointer-events-none absolute top-0 inset-x-0 p-4 safe-top">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass rounded-2xl px-4 py-3 flex items-center justify-between pointer-events-auto">
          <div>
            <div className="text-xs text-[var(--muted-foreground)]">Stations near you</div>
            <div className="text-base font-semibold">{stations?.length ?? "…"} nearby · {availableCount} available</div>
          </div>
          <Button variant="outline" size="sm" onClick={useMyLocation}><Locate className="h-4 w-4" /> Locate</Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute inset-x-0 bottom-24 z-30 mx-3"
          >
            <Card className="p-5">
              <button onClick={() => setSelected(null)} className="absolute right-4 top-4 text-xs text-[var(--muted-foreground)]">Close</button>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2"><MapPin className="h-5 w-5 text-emerald-600" /></div>
                <div className="flex-1">
                  <div className="text-base font-semibold">{selected.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{selected.address}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selected.chargers ?? []).slice(0, 4).map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1 text-xs">
                        <StatusBadge status={c.status} />
                        <span className="font-medium">{c.power_kw}kW</span>
                        <span className="text-[var(--muted-foreground)]">{pricePerKwh(c.price_per_kwh)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link href={`/driver/stations/${selected.id}`}>
                      <Button className="w-full">View station <ChevronRight className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
