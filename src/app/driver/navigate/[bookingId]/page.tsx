"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Play, Pause, Square, Volume2, VolumeX, Navigation2,
  MapPin, Sparkles, Zap, ArrowUp, CornerUpLeft, CornerUpRight,
  RotateCcw,
} from "lucide-react";
import { Card, Button, Skeleton } from "@/components/ui";
import { useDriver } from "@/lib/driver-context";
import { createClient } from "@/lib/supabase/browser";
import { fetchOSRMRoute, positionAlongRoute, straightLineRoute, totalLength, formatDistanceKm, formatDurationMin, type OSRMRoute, type OSRMStep } from "@/lib/geo";
import { speak, cancelSpeech, describeManeuver } from "@/lib/voice";

const PlugMap = dynamic(() => import("@/components/map/plug-map"), { ssr: false, loading: () => <div className="h-full w-full bg-[var(--surface)] animate-pulse" /> });

type Booking = {
  id: string;
  reference: string;
  chargers: { label: string; power_kw: number; stations: { name: string; address: string; lat: number; lng: number } };
};

export default function NavigatePage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { location, setLocation } = useDriver();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [route, setRoute] = useState<OSRMRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
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

  // Load booking + build route
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*, chargers(label, power_kw, stations(name, address, lat, lng))")
        .eq("id", bookingId)
        .maybeSingle();
      setBooking(data as Booking);
    })();
  }, [bookingId]);

  const from = location;
  const to = booking ? { lng: booking.chargers.stations.lng, lat: booking.chargers.stations.lat } : null;

  const buildRoute = useCallback(async () => {
    if (!from || !to) return;
    setRouteError(null);
    try {
      const r = await fetchOSRMRoute(from, to);
      setRoute(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "route failed";
      setRouteError(msg);
      setRoute(straightLineRoute(from, to));
    }
    setProgressM(0);
    setStepIdx(0);
    spokeSteps.current.clear();
  }, [from?.lng, from?.lat, to?.lng, to?.lat]);

  useEffect(() => { buildRoute(); }, [buildRoute]);

  // Simulation loop
  useEffect(() => {
    if (!running || !route) return;
    lastTsRef.current = 0;
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000; // seconds
      lastTsRef.current = ts;
      // Assume 40 km/h base speed; speedMult multiplies simulated speed.
      const metresPerSec = (40 / 3.6) * speedMult;
      setProgressM((p) => {
        const next = p + metresPerSec * dt;
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, route, speedMult]);

  // Position + heading + step tracking
  const pos = useMemo(() => {
    if (!route) return null;
    return positionAlongRoute(route.geometry, progressM);
  }, [route, progressM]);

  useEffect(() => {
    if (!pos) return;
    setLocation({ lng: pos.lng, lat: pos.lat, bearing: pos.bearing });
  }, [pos?.lng, pos?.lat, pos?.bearing, setLocation]);

  // Total length
  const totalM = useMemo(() => (route ? totalLength(route.geometry.coordinates) : 0), [route]);

  // Compute active step + announce
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
    // Distance remaining until the next maneuver (end of current step)
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
      speak("You have arrived at your destination.", { muted: mutedRef.current });
    }
  }, [progressM, route, pos, arrived, totalM]);

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

  if (!booking) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3"><Skeleton className="h-64" /><Skeleton className="h-40" /></div>
    );
  }

  if (!location) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4 pt-8 safe-top">
        <div className="text-lg font-semibold">Set your location first</div>
        <p className="text-sm text-[var(--muted-foreground)]">Open the map and tap to drop your car so PlugSpot can plan the drive to <span className="font-medium">{booking.chargers.stations.name}</span>.</p>
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
          pitch={running ? 55 : 0}
          bearing={running ? location.bearing ?? 0 : 0}
          followCar={running}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 safe-top space-y-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/driver/home" onClick={() => cancelSpeech()}>
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1 float px-3 py-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--primary)]" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Destination</div>
              <div className="text-sm font-semibold truncate">{booking.chargers.stations.name}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMuted((m) => !m)} aria-label="Toggle voice">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {step && !arrived && (
          <motion.div
            key={stepIdx}
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

        {arrived && (
          <motion.div initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto float p-4">
            <div className="text-sm text-[var(--primary)] font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> You have arrived</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{booking.chargers.stations.address}</div>
            <div className="mt-3 flex gap-2">
              <Link className="flex-1" href={`/driver/bookings/${booking.id}`}><Button className="w-full" size="sm"><Zap className="h-4 w-4" /> Open booking</Button></Link>
              <Button size="sm" variant="outline" onClick={stop}><RotateCcw className="h-4 w-4" /></Button>
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
                <Button size="sm" variant="outline" onClick={stop}><Square className="h-4 w-4" /></Button>
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
