"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarCheck } from "lucide-react";
import { Card, Skeleton, Badge } from "@/components/ui";
import { formatSlotLong } from "@/lib/booking";
import { formatNaira } from "@/lib/utils";

type Booking = {
  id: string; reference: string; slot: string; status: string; estimated_cost: number;
  chargers: { label: string; stations: { name: string; address: string } };
};

export default function BookingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    fetch("/api/bookings").then((r) => r.json()).then((d) => setBookings(d.bookings ?? []));
  }, []);

  const now = new Date();
  const filtered = (bookings ?? []).filter((b) => {
    const start = new Date((b.slot as string).split(",")[0].replace(/[\[\(]/, ""));
    return tab === "upcoming" ? start >= now && b.status !== "cancelled" : start < now || b.status === "cancelled";
  });

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <h1 className="text-2xl font-bold">My bookings</h1>
      <div className="glass rounded-2xl p-1 grid grid-cols-2">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-9 rounded-xl text-sm font-medium capitalize ${tab === t ? "bg-emerald-500 text-white" : "text-[var(--muted-foreground)]"}`}>{t}</button>
        ))}
      </div>

      <div className="space-y-3">
        {bookings === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {bookings && filtered.length === 0 && <Card>No {tab} bookings.</Card>}
        {filtered.map((b, i) => {
          const start = new Date((b.slot as string).split(",")[0].replace(/[\[\(]/, ""));
          return (
            <motion.div key={b.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Link href={`/driver/bookings/${b.id}`}>
                <Card className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2"><CalendarCheck className="h-5 w-5 text-emerald-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{b.chargers.stations.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">Charger {b.chargers.label} · {formatSlotLong(start)}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <Badge tone={b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "neutral"}>{b.status}</Badge>
                      <span className="font-medium">{formatNaira(b.estimated_cost)}</span>
                      <span className="text-[var(--muted-foreground)]">· {b.reference}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
