"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Car, Zap, MapPin, Navigation2, CalendarCheck, ArrowRight,
  Activity, Coins, Sparkles,
} from "lucide-react";
import { Card, Button, Skeleton } from "@/components/ui";
import { BatteryRing } from "@/components/battery-ring";
import { useDriver } from "@/lib/driver-context";
import { createClient } from "@/lib/supabase/browser";
import { formatNaira } from "@/lib/utils";
import { formatSlotLong } from "@/lib/booking";

type Booking = {
  id: string; reference: string; slot: string; status: string; estimated_cost: number; estimated_kwh: number;
  chargers: { label: string; power_kw: number; stations: { name: string; address: string; lat: number; lng: number } };
};

export default function DriverHome() {
  const { vehicle, rangeKm, location } = useDriver();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? "");
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setName(p?.full_name ?? "");
      }
      const { data: bk } = await supabase
        .from("bookings")
        .select("*, chargers(label, power_kw, stations(name, address, lat, lng))")
        .order("created_at", { ascending: false });
      setBookings((bk as Booking[]) ?? []);
    })();
  }, []);

  const initials = useMemo(() => {
    const src = (name || email || "").trim();
    if (!src) return "P";
    const parts = src.split(/\s+|@/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }, [name, email]);

  const upcoming = useMemo(() => {
    if (!bookings) return null;
    const future = bookings
      .filter((b) => b.status === "confirmed")
      .map((b) => ({ b, start: new Date((b.slot as string).split(",")[0].replace(/[\[\(]/, "")) }))
      .filter((x) => x.start.getTime() > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    return future[0] ?? null;
  }, [bookings, now]);

  const stats = useMemo(() => {
    if (!bookings) return null;
    const sessions = bookings.filter((b) => b.status !== "cancelled").length;
    const kwh = bookings.reduce((n, b) => n + Number(b.estimated_kwh || 0), 0);
    const spent = bookings.reduce((n, b) => n + (b.status === "cancelled" ? 0 : Number(b.estimated_cost || 0)), 0);
    return { sessions, kwh: Math.round(kwh), spent };
  }, [bookings]);

  const countdown = upcoming ? Math.max(0, Math.floor((upcoming.start.getTime() - now) / 1000)) : 0;
  const cd = formatCountdown(countdown);

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <motion.div
        initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }}
      >
        <Card className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] font-bold flex items-center justify-center text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--muted-foreground)]">Signed in as</div>
            <div className="text-sm font-semibold truncate">{name || email || "Driver"}</div>
          </div>
          <Link href="/driver/profile"><Button variant="ghost" size="sm">View</Button></Link>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2, delay: 0.03 }}>
        <Card>
          <div className="flex items-center gap-4">
            <BatteryRing percent={vehicle.batteryPercent} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1"><Car className="h-3.5 w-3.5" /> My vehicle</div>
              <div className="text-sm font-semibold truncate">{vehicle.model}</div>
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">Estimated range</div>
              <div className="text-xl font-bold tabular-nums">{rangeKm} <span className="text-sm font-medium text-[var(--muted-foreground)]">km</span></div>
            </div>
          </div>
        </Card>
      </motion.div>

      {upcoming ? (
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2, delay: 0.06 }}>
          <Card>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <CalendarCheck className="h-3.5 w-3.5" /> Upcoming booking
            </div>
            <div className="mt-1 text-base font-semibold">{upcoming.b.chargers.stations.name}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Charger {upcoming.b.chargers.label} · {formatSlotLong(upcoming.start)}</div>
            <div className="mt-3 surface-muted p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Starts in</div>
                <div className="text-2xl font-bold tabular-nums">{cd}</div>
              </div>
              <Link href={`/driver/navigate/${upcoming.b.id}`}>
                <Button size="sm"><Navigation2 className="h-4 w-4" /> Navigate</Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      ) : bookings === null ? (
        <Skeleton className="h-28" />
      ) : (
        <Card>
          <div className="text-sm font-semibold">No upcoming booking</div>
          <div className="text-xs text-[var(--muted-foreground)]">Find a charger and reserve a slot.</div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <QuickAction href="/driver/map" icon={MapPin} label="Find charger" />
        <QuickAction href={upcoming ? `/driver/navigate/${upcoming.b.id}` : "/driver/map"} icon={Navigation2} label={upcoming ? "Navigate" : "Plan trip"} />
        <QuickAction href={bookings?.[0] ? `/driver/book/${bookings[0].chargers ? undefined : ""}` : "/driver/map"} icon={Zap} label="Book again" />
      </div>

      {stats && (
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2, delay: 0.09 }}>
          <Card>
            <div className="text-xs text-[var(--muted-foreground)] mb-2 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Stats</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat icon={Activity} label="Sessions" value={String(stats.sessions)} />
              <Stat icon={Zap} label="kWh charged" value={String(stats.kwh)} />
              <Stat icon={Coins} label="Spent" value={formatNaira(stats.spent)} />
            </div>
          </Card>
        </motion.div>
      )}

      <div>
        <div className="text-sm font-semibold px-1 mb-2">Recent activity</div>
        {bookings === null && <Skeleton className="h-16" />}
        {bookings && bookings.length === 0 && (
          <Card><div className="text-sm text-[var(--muted-foreground)]">No sessions yet.</div></Card>
        )}
        <div className="space-y-2">
          {bookings?.slice(0, 4).map((b) => (
            <Link key={b.id} href={`/driver/bookings/${b.id}`}>
              <Card className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{b.chargers.stations.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{b.reference} · {formatNaira(Number(b.estimated_cost))}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {!location && (
        <Card>
          <div className="text-sm font-semibold">Set your location</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Tap anywhere on the map to drop your car. PlugSpot uses this to plan routes and estimate arrival.
          </div>
          <Link href="/driver/map"><Button className="mt-3 w-full" size="sm"><MapPin className="h-4 w-4" /> Open map</Button></Link>
        </Card>
      )}
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Zap; label: string }) {
  return (
    <Link href={href} className="surface p-3 text-center hover:bg-[var(--surface)] transition-colors">
      <div className="mx-auto h-8 w-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center"><Icon className="h-4 w-4 text-[var(--primary)]" /></div>
      <div className="mt-2 text-xs font-semibold">{label}</div>
    </Link>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div>
      <Icon className="h-4 w-4 mx-auto text-[var(--muted-foreground)]" />
      <div className="mt-1 text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{label}</div>
    </div>
  );
}

function formatCountdown(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec - h * 3600) / 60);
  const s = sec - h * 3600 - m * 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
