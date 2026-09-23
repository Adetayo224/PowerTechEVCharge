"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "motion/react";
import {
  MapPin, Search, Filter, Maximize2, Minimize2, Navigation2, Zap, Users, Clock,
  Sparkles, ChevronUp, ChevronDown, Locate,
} from "lucide-react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { useDriver } from "@/lib/driver-context";
import { createClient } from "@/lib/supabase/browser";
import type { Charger, Station } from "@/lib/supabase/types";
import type { ChargerState } from "@/lib/queue";
import { averageSessionMinutes, chargerFreeInMinutes, chargingMinutes } from "@/lib/queue";
import { haversineKm, formatDurationMin, formatDistanceKm } from "@/lib/geo";
import { pricePerKwh } from "@/lib/utils";

const PlugMap = dynamic(() => import("@/components/map/plug-map"), { ssr: false, loading: () => <div className="h-full w-full bg-[var(--surface)] animate-pulse" /> });

type St = Station & { chargers: Charger[] };

export default function DriverMapPage() {
  const { location, setLocation, vehicle } = useDriver();
  const [stations, setStations] = useState<St[]>([]);
  const [states, setStates] = useState<Record<string, ChargerState>>({});
  const [q, setQ] = useState("");
  const [connector, setConnector] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tapToPlace, setTapToPlace] = useState(!location);
  const [center, setCenter] = useState<{ lng: number; lat: number }>({ lng: location?.lng ?? 3.4735, lat: location?.lat ?? 6.4396 });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("stations").select("*, chargers(*)");
      setStations((data as St[]) ?? []);
      const { data: st } = await supabase.from("charger_state").select("*");
      const map: Record<string, ChargerState> = {};
      (st as ChargerState[] | null)?.forEach((s) => { map[s.charger_id] = s; });
      setStates(map);
    })();
  }, []);

  // Subscribe to realtime updates for charger state.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("charger-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "charger_state" }, (payload) => {
        const row = payload.new as ChargerState | undefined;
        if (!row) return;
        setStates((prev) => ({ ...prev, [row.charger_id]: row }));
      })
      .subscribe();
    // Advance the server simulator every 6 seconds while the map is open.
    const ping = setInterval(() => { fetch("/api/tick", { method: "POST" }).catch(() => {}); }, 6000);
    fetch("/api/tick", { method: "POST" }).catch(() => {});
    return () => { supabase.removeChannel(channel); clearInterval(ping); };
  }, []);

  const mapStations = useMemo(() => stations.map((s) => {
    const online = s.chargers.filter((c) => c.status === "online").length;
    const total = s.chargers.length;
    const waiting = s.chargers.reduce((n, c) => n + (states[c.id]?.waiting ?? 0), 0);
    return { id: s.id, name: s.name, lat: s.lat, lng: s.lng, online, total, waiting };
  }), [stations, states]);

  const enriched = useMemo(() => {
    const carLoc = location ? { lng: location.lng, lat: location.lat } : null;
    return stations.map((s) => {
      const km = carLoc ? haversineKm(carLoc, { lng: s.lng, lat: s.lat }) : null;
      const online = s.chargers.filter((c) => c.status === "online");
      const cheapest = online.length ? Math.min(...online.map((c) => c.price_per_kwh)) : null;
      const maxPower = online.length ? Math.max(...online.map((c) => c.power_kw)) : 0;
      const waitMin = smallestWait(s.chargers, states);
      const driveMin = km !== null ? (km / 40) * 60 : null;
      const ttsMin = km !== null ? (driveMin ?? 0) + waitMin : null;
      const chargeMin = maxPower ? chargingMinutes(vehicle.batteryPercent, vehicle.targetPercent, vehicle.batteryKwh, maxPower) : 0;
      return { s, km, cheapest, maxPower, waitMin, driveMin, ttsMin, chargeMin, waitingCount: s.chargers.reduce((n, c) => n + (states[c.id]?.waiting ?? 0), 0) };
    });
  }, [stations, states, location, vehicle]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return enriched.filter(({ s }) => {
      if (ql && !(s.name + " " + s.city + " " + s.address).toLowerCase().includes(ql)) return false;
      if (connector && !s.chargers.some((c) => c.connector_type === connector)) return false;
      if (maxPrice && !s.chargers.some((c) => c.price_per_kwh <= Number(maxPrice))) return false;
      if (availableNow && !s.chargers.some((c) => c.status === "online")) return false;
      return true;
    }).sort((a, b) => {
      if (a.ttsMin !== null && b.ttsMin !== null) return a.ttsMin - b.ttsMin;
      if (a.km !== null && b.km !== null) return a.km - b.km;
      return a.s.name.localeCompare(b.s.name);
    });
  }, [enriched, q, connector, maxPrice, availableNow]);

  // Smart routing card: is a farther station faster?
  const smart = useMemo(() => {
    if (!location) return null;
    const online = filtered.filter((f) => f.ttsMin !== null && f.s.chargers.some((c) => c.status === "online"));
    if (online.length < 2) return null;
    const byDrive = [...online].sort((a, b) => (a.driveMin ?? 0) - (b.driveMin ?? 0));
    const nearest = byDrive[0];
    const byTts = [...online].sort((a, b) => (a.ttsMin ?? 0) - (b.ttsMin ?? 0));
    const best = byTts[0];
    if (nearest.s.id === best.s.id) return null;
    const savings = (nearest.ttsMin ?? 0) - (best.ttsMin ?? 0);
    if (savings < 8) return null;
    const extraKm = (best.km ?? 0) - (nearest.km ?? 0);
    return { best, nearest, savings, extraKm };
  }, [filtered, location]);

  const mapHeightPct = fullscreen ? 100 : 55;

  return (
    <div className="relative h-dvh overflow-hidden">
      <div style={{ height: `${mapHeightPct}%` }} className="relative transition-all duration-200">
        <PlugMap
          stations={mapStations}
          car={location ?? null}
          center={center}
          onMapClick={(lng, lat) => {
            if (!tapToPlace) return;
            setLocation({ lng, lat, bearing: location?.bearing ?? 0 });
            setCenter({ lng, lat });
            setTapToPlace(false);
          }}
          onStationClick={(id) => {
            const s = stations.find((x) => x.id === id);
            if (s) setCenter({ lng: s.lng, lat: s.lat });
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 safe-top flex items-start justify-between gap-2">
          <div className="pointer-events-auto float px-3 py-2 flex items-center gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span className="font-medium">{location ? "Location set" : "Tap map to set your location"}</span>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTapToPlace((v) => !v)}>
              <Locate className="h-4 w-4" /> {tapToPlace ? "Cancel" : location ? "Move" : "Set location"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFullscreen((v) => !v)}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {smart && (
          <div className="absolute left-3 right-3 bottom-3 z-30">
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <div className="float p-4">
                <div className="flex items-center gap-2 text-xs text-[var(--primary)] font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Faster option
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-semibold">{smart.best.s.name}</span> is{" "}
                  <span className="font-semibold">{formatDistanceKm(smart.extraKm)}</span> farther, but you start charging{" "}
                  <span className="font-semibold text-[var(--primary)]">{formatDurationMin(smart.savings)}</span> sooner.
                </div>
                <div className="mt-3 flex gap-2">
                  <Link className="flex-1" href={`/driver/stations/${smart.best.s.id}`}>
                    <Button size="sm" className="w-full"><Navigation2 className="h-4 w-4" /> Go there</Button>
                  </Link>
                  <Link href={`/driver/stations/${smart.nearest.s.id}`}>
                    <Button size="sm" variant="outline">Keep nearest</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {!fullscreen && (
        <BottomSheet>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input placeholder="Search station or area" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
                <Filter className="h-4 w-4" /> Filters
              </Button>
              <div className="text-xs text-[var(--muted-foreground)] ml-1">
                {filtered.length} station{filtered.length === 1 ? "" : "s"}
              </div>
            </div>
            {showFilters && (
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={availableNow} onChange={(e) => setAvailableNow(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                  <span className="text-sm">Only stations with a charger online now</span>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted-foreground)] mb-1">Connector</div>
                  <div className="flex flex-wrap gap-2">
                    {["", "CCS2", "Type 2", "CHAdeMO", "GB/T"].map((c) => (
                      <button key={c || "any"} onClick={() => setConnector(c)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${connector === c ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
                        {c || "Any"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted-foreground)] mb-1">Max price per kWh (₦)</div>
                  <Input inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 250" />
                </div>
              </Card>
            )}

            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] px-1 mt-1">
              Sorted by time to start charging
            </div>

            <div className="space-y-2">
              {filtered.map(({ s, km, cheapest, waitMin, driveMin, ttsMin, waitingCount }) => (
                <Link key={s.id} href={`/driver/stations/${s.id}`}>
                  <Card className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-[var(--primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{s.name}</div>
                        <div className="text-xs text-[var(--muted-foreground)] truncate">{s.address}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          <StatusBadge status={s.chargers.some((c) => c.status === "online") ? "online" : "offline"} />
                          {waitingCount > 0 && (
                            <Badge tone="accent"><Users className="h-3 w-3" /> {waitingCount} waiting</Badge>
                          )}
                          {cheapest !== null && <span className="font-medium">from {pricePerKwh(cheapest)}</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {km !== null && <div className="font-semibold">{formatDistanceKm(km)}</div>}
                        {ttsMin !== null && (
                          <div className="mt-1 flex items-center justify-end gap-1 text-[var(--primary)] font-semibold">
                            <Clock className="h-3 w-3" /> {formatDurationMin(ttsMin)}
                          </div>
                        )}
                        {driveMin !== null && waitMin > 0 && (
                          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">drive {Math.round(driveMin)} + wait {Math.round(waitMin)}</div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
              {filtered.length === 0 && (
                <Card><div className="text-sm text-[var(--muted-foreground)]">No stations match your filters.</div></Card>
              )}
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function smallestWait(chargers: Charger[], states: Record<string, ChargerState>): number {
  const online = chargers.filter((c) => c.status === "online");
  if (!online.length) return 999;
  return Math.min(...online.map((c) => {
    const s = states[c.id];
    if (!s || !s.in_use) return 0;
    return chargerFreeInMinutes(s) + (s.waiting ?? 0) * averageSessionMinutes(c);
  }));
}

function BottomSheet({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const y = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  const [vh, setVh] = useState(844);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    animate(y, expanded ? -0.4 : 0, { duration: 0.22, ease: [0.32, 0.72, 0, 1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <motion.div
      ref={ref}
      className="absolute inset-x-0 bottom-0 z-40"
      style={{ height: "45%" }}
      drag="y"
      dragConstraints={{ top: -vh * 0.35, bottom: 0 }}
      dragElastic={0.05}
      onDragEnd={(_, info) => {
        if (info.velocity.y < -200 || info.point.y < vh * 0.5) setExpanded(true);
        else if (info.velocity.y > 200) setExpanded(false);
      }}
    >
      <div className="mx-auto max-w-md h-full flex flex-col float rounded-t-2xl rounded-b-none">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full pt-2 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing"
          aria-label="Toggle sheet"
        >
          <div className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          {expanded ? <ChevronDown className="h-3 w-3 mt-1 text-[var(--muted-foreground)]" /> : <ChevronUp className="h-3 w-3 mt-1 text-[var(--muted-foreground)]" />}
        </button>
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
