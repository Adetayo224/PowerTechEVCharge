"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Input, Skeleton, Badge } from "@/components/ui";
import { Building2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type St = {
  id: string; name: string; address: string; city: string; owner_id: string;
  chargers: { id: string; status: string }[];
  owner?: { full_name: string | null; role: string };
};

export default function AdminStations() {
  const [rows, setRows] = useState<St[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: stations } = await supabase.from("stations").select("*, chargers(id, status)");
      const list = ((stations ?? []) as St[]).map((s) => ({
        ...s,
        chargers: Array.isArray(s.chargers) ? s.chargers : [],
      }));
      // Look up owners in a second call (admin can read all profiles)
      const ownerIds = Array.from(new Set(list.map((s) => s.owner_id).filter(Boolean)));
      if (ownerIds.length) {
        const { data: owners } = await supabase.from("profiles").select("id, full_name, role").in("id", ownerIds);
        const map = new Map<string, { full_name: string | null; role: string }>();
        owners?.forEach((o) => map.set(o.id, { full_name: o.full_name, role: o.role }));
        list.forEach((s) => { s.owner = map.get(s.owner_id); });
      }
      setRows(list);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const ql = q.toLowerCase();
    if (!ql) return rows;
    return rows.filter((s) => (s.name + " " + s.city + " " + s.address + " " + (s.owner?.full_name ?? "")).toLowerCase().includes(ql));
  }, [rows, q]);

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">Stations</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input placeholder="Search stations or owner" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {rows === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        {filtered?.length === 0 && <Card>No stations.</Card>}
        {filtered?.map((s) => {
          const online = s.chargers.filter((c) => c.status === "online").length;
          const unclaimed = s.owner?.role === "admin";
          return (
            <Link key={s.id} href={`/operator/stations/${s.id}`}>
              <Card className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate">{s.address}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={unclaimed ? "accent" : "primary"}>{unclaimed ? "Unclaimed" : "Claimed"}</Badge>
                    <span className="text-[var(--muted-foreground)]">Owner: {s.owner?.full_name ?? "unknown"}</span>
                    <span>· {online}/{s.chargers.length} online</span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
