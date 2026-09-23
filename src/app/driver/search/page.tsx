"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search as SearchIcon, MapPin, Filter } from "lucide-react";
import Link from "next/link";
import { Card, Input, Button, Skeleton } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import type { Charger, Station } from "@/lib/supabase/types";
import { pricePerKwh } from "@/lib/utils";

type St = Station & { chargers?: Charger[] };
const CONNECTORS = ["", "CCS2", "Type 2", "CHAdeMO", "GB/T"] as const;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [connector, setConnector] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [availableNow, setAvailableNow] = useState(true);
  const [sort, setSort] = useState<"price" | "name">("price");
  const [stations, setStations] = useState<St[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (connector) params.set("connector", connector);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (availableNow) params.set("availableNow", "1");
    fetch(`/api/stations?${params.toString()}`).then((r) => r.json()).then((d) => setStations(d.stations ?? []));
  }, [q, connector, maxPrice, availableNow]);

  const sorted = useMemo(() => {
    if (!stations) return null;
    const arr = [...stations];
    if (sort === "price") {
      arr.sort((a, b) => {
        const pa = Math.min(...(a.chargers ?? []).map((c) => c.price_per_kwh || Infinity));
        const pb = Math.min(...(b.chargers ?? []).map((c) => c.price_per_kwh || Infinity));
        return pa - pb;
      });
    } else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [stations, sort]);

  return (
    <div className="p-4 pt-6 safe-top space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Find a charger</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input placeholder="Search by area, city, or station" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}><Filter className="h-4 w-4" /> Filters</Button>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-[var(--muted-foreground)]">Sort</span>
          <select className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-2 py-1.5" value={sort} onChange={(e) => setSort(e.target.value as "price"|"name")}>
            <option value="price">Cheapest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      {showFilters && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
          <Card className="space-y-3">
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1">Connector</div>
              <div className="flex flex-wrap gap-2">
                {CONNECTORS.map((c) => (
                  <button key={c || "any"} onClick={() => setConnector(c)}
                    className={`px-3 py-1.5 text-xs rounded-full border ${connector === c ? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
                    {c || "Any"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1">Max price per kWh (₦)</div>
              <Input inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 250" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={availableNow} onChange={(e) => setAvailableNow(e.target.checked)} />
              Only stations with a charger online now
            </label>
          </Card>
        </motion.div>
      )}

      <div className="space-y-3">
        {sorted === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {sorted?.length === 0 && <Card>No stations match your filters.</Card>}
        {sorted?.map((s, i) => {
          const minPrice = Math.min(...(s.chargers ?? []).map((c) => c.price_per_kwh || Infinity));
          const online = (s.chargers ?? []).filter((c) => c.status === "online").length;
          return (
            <motion.div key={s.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Link href={`/driver/stations/${s.id}`}>
                <Card className="flex items-center gap-3">
                  <div className="rounded-xl bg-[var(--primary-soft)] p-2"><MapPin className="h-5 w-5 text-[var(--primary)]" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold truncate">{s.name}</div>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] truncate">{s.address}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <StatusBadge status={online > 0 ? "online" : "offline"} />
                      <span>{online}/{(s.chargers ?? []).length} online</span>
                      <span className="text-[var(--muted-foreground)]">·</span>
                      <span className="font-medium">from {pricePerKwh(minPrice || 0)}</span>
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
