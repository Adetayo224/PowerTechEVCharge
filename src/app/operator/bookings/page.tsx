"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, Skeleton, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";
import { formatSlotLong } from "@/lib/booking";
import { formatNaira } from "@/lib/utils";

type B = { id: string; reference: string; slot: string; status: string; estimated_cost: number; driver_id: string;
  chargers: { label: string; stations: { id: string; name: string } } };
type Station = { id: string; name: string };

export default function OperatorBookings() {
  const [rows, setRows] = useState<B[] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: st }, { data: bk }] = await Promise.all([
        supabase.from("stations").select("id, name"),
        supabase.from("bookings").select("*, chargers(label, stations(id, name))").order("created_at", { ascending: false }),
      ]);
      setStations((st as Station[]) ?? []);
      setRows((bk as B[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    return rows.filter((b) => (!stationId || b.chargers.stations.id === stationId) && (!status || b.status === status));
  }, [rows, stationId, status]);

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <div className="flex gap-2">
        <select className="h-11 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm" value={stationId} onChange={(e) => setStationId(e.target.value)}>
          <option value="">All stations</option>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        {filtered?.length === 0 && <Card>No bookings match your filters.</Card>}
        {filtered?.map((b, i) => {
          const start = new Date((b.slot as string).split(",")[0].replace(/[\[\(]/, ""));
          return (
            <motion.div key={b.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Card>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{b.chargers.stations.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">Charger {b.chargers.label} · {formatSlotLong(start)}</div>
                    <div className="text-xs mt-1"><Badge tone={b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "neutral"}>{b.status}</Badge> · {b.reference}</div>
                  </div>
                  <div className="text-sm font-bold">{formatNaira(Number(b.estimated_cost))}</div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
