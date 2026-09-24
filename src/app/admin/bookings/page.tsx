"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, Input, Skeleton, Badge } from "@/components/ui";
import { CalendarRange, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { formatSlotLong } from "@/lib/booking";
import { formatNaira } from "@/lib/utils";

type B = {
  id: string; reference: string; slot: string; status: string;
  estimated_cost: number; created_at: string;
  chargers: { label: string; stations: { name: string; city: string } };
};

export default function AdminBookings() {
  const [rows, setRows] = useState<B[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*, chargers(label, stations(name, city))")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as B[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const ql = q.toLowerCase();
    if (!ql) return rows;
    return rows.filter((b) => (b.reference + " " + b.chargers.stations.name + " " + b.chargers.stations.city).toLowerCase().includes(ql));
  }, [rows, q]);

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-5 w-5 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">All bookings</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input placeholder="Search reference or station" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {rows === null && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        {filtered?.length === 0 && <Card>No bookings.</Card>}
        {filtered?.map((b) => {
          const start = new Date((b.slot as string).split(",")[0].replace(/[\[\(]/, ""));
          return (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{b.chargers.stations.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Charger {b.chargers.label} · {formatSlotLong(start)}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Badge tone={b.status === "confirmed" ? "primary" : b.status === "cancelled" ? "accent" : "neutral"}>{b.status}</Badge>
                    <span className="font-mono">{b.reference}</span>
                  </div>
                </div>
                <div className="text-sm font-bold text-right whitespace-nowrap">{formatNaira(Number(b.estimated_cost))}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
