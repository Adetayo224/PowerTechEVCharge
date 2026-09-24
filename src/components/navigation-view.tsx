"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Play, Pause, Square, Volume2, VolumeX, Navigation2,
  MapPin, Sparkles, Zap, ArrowUp, CornerUpLeft, CornerUpRight, RotateCcw,
  Route as RouteIcon,
} from "lucide-react";
import { Card, Button, Skeleton } from "@/components/ui";
import { useDriver } from "@/lib/driver-context";
import { createClient } from "@/lib/supabase/browser";
import {
  fetchOSRMRoute, positionAlongRoute, straightLineRoute, totalLength,
  formatDistanceKm, formatDurationMin, type OSRMRoute, type OSRMStep,
  haversineKm,
} from "@/lib/geo";
import { speak, cancelSpeech, describeManeuver } from "@/lib/voice";
import type { Charger, Station } from "@/lib/supabase/types";
import type { ChargerState } from "@/lib/queue";
import { averageSessionMinutes, chargerFreeInMinutes } from "@/lib/queue";

const PlugMap = dynamic(() => import("@/components/map/plug-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[var(--surface)] animate-pulse" />,
});

type Destination = {
  id: string;               // station id
  name: string;
  address: string;
  lng: number;
  lat: number;
};

type Props = {
  destination: Destination;
  bookingId?: string;       // If present, shows Open booking on arrival, otherwise Book now.
  backHref?: string;
  bookHref?: string;        // Fallback: link to the station page for booking.
};

const REROUTE_SAVINGS_MIN = 8;

export function NavigationView({ destination, bookingId, backHref = "/driver/home", bookHref }: Props) {
  const { location, setLocation } = useDriver();
  const [route, setRoute] = useState<OSRMRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [dest, setDest] = useState<Destination>(destination);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const [running, setRunning] = useState(false);
  const [speedMult, setSpeedMult] = useState<1 | 5 | 20>(5);
  const [progressM, setProgressM] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [arrived, setArrived] = useState(false);
  const spokeSteps = useRef<Set<number>>(new Set());
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  // Reroute state
  const [suggestion, setSuggestion] = useState<{
    destination: Destination;
    savingsMin: number;
  } | null>(null);
  const suggestionSpokenRef = useRef<string | null>(null);

  const from = location;

  const buildRoute = useCallback(async (to: Destination) => {
    if (!from) return;
    setRouteError(null);
    try {
      const r = await fetchOSRMRoute({ lng: from.lng, lat: from.lat }, { lng: to.lng, lat: to.lat });
      setRoute(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "route failed";
      setRouteError(msg);
      setRoute(straightLineRoute({ lng: from.lng, lat: from.lat }, { lng: to.lng, lat: to.lat }));
    }
    setProgressM(0);
    setStepIdx(0);
    spokeSteps.current.clear();
  }, [from?.lng, from?.lat]);

  useEffect(() => { buildRoute(dest); }, [buildRoute, dest.id, dest.lng, dest.lat]);

  // Simulation
  useEffect(() => {
    if (!running || !route) return;
    lastTsRef.current = 0;
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const metresPerSec = (40 / 3.6) * speedMult;
      setProgressM((p) => p + metresPerSec * dt);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, route, speedMult]);

  const pos = useMemo(() => {
    if (!route) return null;
    return positionAlongRoute(route.geometry, progressM);
  }, [route, progressM]);

  useEffect(() => {
    if (!pos) return;
    setLocation({ lng: pos.lng, lat: pos.lat, bearing: pos.bearing });
  }, [pos?.lng, pos?.lat, pos?.bearing, setLocation]);

  const totalM = useMemo(() => (route ? totalLength(route.geometry.coordinates) : 0), [route]);

  useEffect(() => {
    if (!route || !pos || arrived) return;
    let acc = 0;
    let currentStep = 0;
    for (let i = 0; i < route.steps.length; i++) {
      const legM = route.steps[i].distance;
      if (acc + legM >= progressM) { currentStep = i; break; }
      acc += legM;
    }
    setStepIdx(currentStep);
    const step = route.steps[currentStep];
    if (step) {
      const stepStart = acc;
      const distToTurn = Math.max(0, stepStart + step.distance - progressM);
      const nextStep = route.steps[currentStep + 1];
      if (nextStep) {
        const thresholds = [500, 200, 60];
        for (const t of thresholds) {
          const key = currentStep * 10 + t;
          if (distToTurn <= t && !spokeSteps.current.has(key)) {
            spokeSteps.current.add(key);
            const desc = describeManeuver(nextStep);
            const prefix = t === 60 ? "Now, " : t === 200 ? "In 200 metres, " : "In 500 metres, ";
            speak(prefix + desc.charAt(0).toLowerCase() + desc.slice(1), { muted: mutedRef.current });
            break;
          }
        }
      }
    }
    if (progressM >= totalM - 15 && !arrived) {
      setArrived(true);
      setRunning(false);
      speak(`You have arrived at ${dest.name}.`, { muted: mutedRef.current });
    }
  }, [progressM, route, pos, arrived, totalM, dest.name]);

  // Mid-route rerouting: periodically re-evaluate all stations and suggest a faster one.
  useEffect(() => {
    if (!running || arrived) return;
    let cancelled = false;
    const check = async () => {
      if (!from || !route) return;
      try {
        const supabase = createClient();
        const [{ data: stationsData }, { data: statesData }] = await Promise.all([
          supabase.from("stations").select("*, chargers(*)").ilike("name", "PlugSpot%"),
          supabase.from("charger_state").select("*"),
        ]);
        const stations = (stationsData as (Station & { chargers: Charger[] })[]) ?? [];
        const states = new Map<string, ChargerState>();
        (statesData as ChargerState[] | undefined)?.forEach((s) => states.set(s.charger_id, s));

        // Current destination TTS = remaining drive time + wait at destination
        const currentStation = stations.find((s) => s.id === dest.id);
        const remainingM = Math.max(0, totalM - progressM);
        const remainingDriveMin = (remainingM / 1000 / 40) * 60;
        const currentWait = currentStation ? waitForStation(currentStation.chargers, states) : 0;
        const currentTts = remainingDriveMin + currentWait;

        // Alternatives: skip current, need at least one online charger
        let best: { s: Station & { chargers: Charger[] }; tts: number } | null = null;
        for (const s of stations) {
          if (s.id === dest.id) continue;
          if (!s.chargers.some((c) => c.status === "online")) continue;
          const km = haversineKm({ lng: pos?.lng ?? from.lng, lat: pos?.lat ?? from.lat }, { lng: s.lng, lat: s.lat });
          const driveMin = (km / 40) * 60;
          const wait = waitForStation(s.chargers, states);
          const tts = driveMin + wait;
          if (!best || tts < best.tts) best = { s, tts };
        }

        if (best && currentTts - best.tts >= REROUTE_SAVINGS_MIN) {
          if (cancelled) return;
          const nextDest: Destination = {
            id: best.s.id,
            name: best.s.name,
            address: best.s.address,
            lng: best.s.lng,
            lat: best.s.lat,
          };
          const savingsMin = Math.round(currentTts - best.tts);
          setSuggestion({ destination: nextDest, savingsMin });
          if (suggestionSpokenRef.current !== best.s.id) {
            suggestionSpokenRef.current = best.s.id;
            speak(`A faster charger is available at ${best.s.name}, saving ${savingsMin} minutes. Tap to reroute.`, { muted: mutedRef.current });
          }
        } else {
          setSuggestion(null);
          suggestionSpokenRef.current = null;
        }
      } catch (e) {
        console.warn("[reroute] check failed", e);
      }
    };
    check();
    const iv = setInterval(check, 15_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [running, arrived, dest.id, totalM, progressM, from?.lng, from?.lat, pos?.lng, pos?.lat, route]);

  function acceptReroute() {
    if (!suggestion) return;
    const next = suggestion.destination;
    setSuggestion(null);
    suggestionSpokenRef.current = null;
    setDest(next);
    speak(`Rerouting to ${next.name}.`, { muted: mutedRef.current, interrupt: true });
    // buildRoute will fire off the dest.id change effect
  }
  function keepRoute() { setSuggestion(null); }

  const remainingM = Math.max(0, totalM - progressM);
  const remainingMinAt40 = (remainingM / 1000 / 40) * 60;
  const eta = new Date(Date.now() + remainingMinAt40 * 60_000);

  const step = route?.steps[stepIdx];
  const stepDistM = useMemo(() => {
    if (!route) return 0;
    let acc = 0;
    for (let i = 0; i < stepIdx; i++) acc += route.steps[i].distance;
    const cur = route.steps[stepIdx];
    if (!cur) return 0;
    return Math.max(0, acc + cur.distance - progressM);
  }, [route, stepIdx, progressM]);

  function start() {
    if (!route) return;
    setRunning(true);
    setArrived(false);
    if (progressM === 0 && route.steps[0]) speak(describeManeuver(route.steps[0]), { muted: mutedRef.current, interrupt: true });
  }
  function pause() { setRunning(false); cancelSpeech(); }
  function stop() { setRunning(false); setProgressM(0); setArrived(false); cancelSpeech(); spokeSteps.current.clear(); }

  if (!location) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4 pt-8 safe-top">
        <div className="text-lg font-semibold">Set your location first</div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Open the map and tap to drop your car so PlugSpot can plan the drive to <span className="font-medium">{dest.name}</span>.
        </p>
        <Link href="/driver/map"><Button className="w-full"><MapPin className="h-4 w-4" /> Open map</Button></Link>
      </div>
    );
  }

  const nextIcon = step ? maneuverIcon(step) : ArrowUp;

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <PlugMap
          stations={[]}
          car={location}
          route={route ? { geometry: route.geometry, bounds: route.bounds } : null}
          zoom={running ? 17 : 14}
          followCar={running}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 safe-top space-y-3 z-20">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href={backHref} onClick={() => cancelSpeech()}>
            <Button variant="outline" size="sm" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1 float px-3 py-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--primary)]" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Destination</div>
              <div className="text-sm font-semibold truncate">{dest.name}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMuted((m) => !m)} aria-label="Toggle voice">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {step && !arrived && (
          <motion.div
            key={dest.id + ":" + stepIdx}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto float p-4 flex items-center gap-3"
          >
            <div className="h-12 w-12 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] flex items-center justify-center">
              {(() => { const I = nextIcon; return <I className="h-6 w-6" />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold tabular-nums">{formatDistanceKm(stepDistM / 1000)}</div>
              <div className="text-sm text-[var(--muted-foreground)] truncate">{describeManeuver(step)}</div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {suggestion && !arrived && (
            <motion.div
              key={suggestion.destination.id}
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              className="pointer-events-auto float p-4"
            >
              <div className="text-[10px] uppercase tracking-wider text-[var(--primary)] flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Faster charger available</div>
              <div className="mt-1 text-sm">
                <span className="font-semibold">{suggestion.destination.name}</span> saves{" "}
                <span className="font-semibold text-[var(--primary)]">{suggestion.savingsMin} min</span>.
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={acceptReroute} className="flex-1"><RouteIcon className="h-4 w-4" /> Accept</Button>
                <Button size="sm" variant="outline" onClick={keepRoute}>Keep route</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {arrived && (
          <motion.div initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto float p-4">
            <div className="text-sm text-[var(--primary)] font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> You have arrived</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{dest.address}</div>
            <div className="mt-3 flex gap-2">
              {bookingId ? (
                <Link className="flex-1" href={`/driver/bookings/${bookingId}`}><Button className="w-full" size="sm"><Zap className="h-4 w-4" /> Open booking</Button></Link>
              ) : (
                <Link className="flex-1" href={bookHref ?? `/driver/stations/${dest.id}`}><Button className="w-full" size="sm"><Zap className="h-4 w-4" /> Book now</Button></Link>
              )}
              <Button size="sm" variant="outline" onClick={stop} aria-label="Restart"><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-40 safe-bottom pointer-events-none">
        <div className="mx-auto max-w-md p-3 pointer-events-auto">
          <div className="float p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Remaining</div>
                <div className="text-lg font-bold tabular-nums">{formatDistanceKm(remainingM / 1000)} · {formatDurationMin(remainingMinAt40)}</div>
                <div className="text-xs text-[var(--muted-foreground)]">ETA {eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="flex items-center gap-2">
                {!running ? (
                  <Button size="sm" onClick={start} disabled={!route}><Play className="h-4 w-4" /> {progressM === 0 ? "Start" : "Resume"}</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={pause}><Pause className="h-4 w-4" /> Pause</Button>
                )}
                <Button size="sm" variant="outline" onClick={stop} aria-label="Stop"><Square className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Speed</span>
              {([1, 5, 20] as const).map((m) => (
                <button key={m} onClick={() => setSpeedMult(m)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${speedMult === m ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
                  {m}x
                </button>
              ))}
              {routeError && (
                <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">Router unavailable · using fallback</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function maneuverIcon(step: OSRMStep) {
  const m = step.maneuver.modifier;
  if (m === "left" || m === "sharp left" || m === "slight left") return CornerUpLeft;
  if (m === "right" || m === "sharp right" || m === "slight right") return CornerUpRight;
  if (step.maneuver.type === "arrive") return Navigation2;
  return ArrowUp;
}

function waitForStation(chargers: Charger[], states: Map<string, ChargerState>): number {
  const online = chargers.filter((c) => c.status === "online");
  if (!online.length) return 999;
  return Math.min(...online.map((c) => {
    const s = states.get(c.id);
    if (!s || !s.in_use) return 0;
    return chargerFreeInMinutes(s) + (s.waiting ?? 0) * averageSessionMinutes(c);
  }));
}

// Loading fallback for a suspense-style parent.
export function NavigationSkeleton() {
  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <Skeleton className="h-64" />
      <Card className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </Card>
    </div>
  );
}
