"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ShieldCheck, Users, Building2, Zap, CalendarCheck, TrendingUp, LogOut,
} from "lucide-react";
import { Card, Skeleton, Button } from "@/components/ui";
import { AnimatedNumber } from "@/components/counter";
import { NotificationBell } from "@/components/notification-bell";
import { createClient } from "@/lib/supabase/browser";
import { formatNaira } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import { useRouter } from "next/navigation";

type Booking = { id: string; slot: string; status: string; estimated_cost: number; created_at: string; chargers: { label: string; stations: { name: string } } };

export default function AdminDashboard() {
  const router = useRouter();
  const [stations, setStations] = useState(0);
  const [chargersOnline, setChargersOnline] = useState(0);
  const [chargersTotal, setChargersTotal] = useState(0);
  const [drivers, setDrivers] = useState(0);
  const [operators, setOperators] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: st }, { data: ch }, { data: pf }, { data: bk }] = await Promise.all([
        supabase.from("stations").select("id"),
        supabase.from("chargers").select("id, status"),
        supabase.from("profiles").select("id, role"),
        supabase.from("bookings").select("*, chargers(label, stations(name))").order("created_at", { ascending: false }).limit(100),
      ]);
      setStations(st?.length ?? 0);
      setChargersTotal(ch?.length ?? 0);
      setChargersOnline((ch ?? []).filter((c) => c.status === "online").length);
      setDrivers((pf ?? []).filter((p) => p.role === "driver").length);
      setOperators((pf ?? []).filter((p) => p.role === "operator").length);
      setBookings((bk as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const todayStr = formatInTimeZone(new Date(), "Africa/Lagos", "yyyy-MM-dd");
  const bookingsToday = bookings.filter((b) => b.created_at.startsWith(todayStr));
  const revenueToday = bookingsToday.filter((b) => b.status !== "cancelled").reduce((n, b) => n + Number(b.estimated_cost), 0);
  const revenueAll = bookings.filter((b) => b.status !== "cancelled").reduce((n, b) => n + Number(b.estimated_cost), 0);

  const days = useMemo(() => {
    const arr: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = formatInTimeZone(d, "Africa/Lagos", "yyyy-MM-dd");
      arr.push({
        label: formatInTimeZone(d, "Africa/Lagos", "EEE"),
        value: bookings.filter((b) => b.created_at.startsWith(ds) && b.status !== "cancelled").length,
      });
    }
    return arr;
  }, [bookings]);
  const max = Math.max(1, ...days.map((d) => d.value));

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--primary)] font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Admin
          </div>
          <h1 className="text-2xl font-bold">Overview</h1>
        </div>
        <NotificationBell />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Stations" icon={Building2} value={stations} />
        <Stat label="Chargers online" icon={Zap} value={chargersOnline} suffix={`/${chargersTotal}`} />
        <Stat label="Drivers" icon={Users} value={drivers} />
        <Stat label="Operators" icon={Users} value={operators} />
        <Stat label="Bookings today" icon={CalendarCheck} value={bookingsToday.length} />
        <Stat label="Revenue today" icon={TrendingUp} value={revenueToday} format={(n) => formatNaira(n)} />
      </div>

      <Card>
        <div className="text-sm font-semibold mb-3">Last 7 days</div>
        <div className="flex items-end gap-2 h-32">
          {days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / max) * 100}%` }} transition={{ delay: i * 0.05 }}
                className="w-full rounded-t-md bg-[var(--primary)] min-h-[4px]" />
              <div className="text-[10px] text-[var(--muted-foreground)]">{d.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold mb-2">Recent bookings</div>
        {loading && <Skeleton className="h-16" />}
        {!loading && bookings.length === 0 && <div className="text-sm text-[var(--muted-foreground)]">No bookings yet.</div>}
        <div className="space-y-2">
          {bookings.slice(0, 8).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm">
              <div className="truncate">
                <div className="font-medium truncate">{b.chargers.stations.name}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Charger {b.chargers.label} · {b.status}</div>
              </div>
              <div className="text-sm font-semibold">{formatNaira(Number(b.estimated_cost))}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="text-center text-xs text-[var(--muted-foreground)]">
        Lifetime revenue tracked: <span className="text-foreground font-semibold">{formatNaira(revenueAll)}</span>
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>

      <div className="text-center text-xs text-[var(--muted-foreground)] pt-2">
        <Link href="/admin/users">Users</Link> · <Link href="/admin/stations">Stations</Link> · <Link href="/admin/bookings">Bookings</Link>
      </div>
    </div>
  );
}

function Stat({ label, icon: Icon, value, format, suffix }: { label: string; icon: typeof Users; value: number; format?: (n: number) => string; suffix?: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Icon className="h-4 w-4 text-[var(--primary)]" /> {label}</div>
      <div className="mt-1 text-2xl font-bold"><AnimatedNumber value={value} format={format} />{suffix}</div>
    </Card>
  );
}
