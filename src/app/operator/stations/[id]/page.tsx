"use client";
import { use, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Zap } from "lucide-react";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/browser";
import type { Charger, ChargerStatus, Connector, Station } from "@/lib/supabase/types";
import { pricePerKwh } from "@/lib/utils";

type St = Station & { chargers?: Charger[] };
const CONNECTORS: Connector[] = ["CCS2","Type 2","CHAdeMO","GB/T"];
const STATUSES: ChargerStatus[] = ["online","offline","unavailable"];

export default function OperatorStation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [station, setStation] = useState<St | null>(null);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ label: "", connector_type: "CCS2" as Connector, power_kw: 60, price_per_kwh: 250 });

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.from("stations").select("*, chargers(*)").eq("id", id).maybeSingle();
    setStation(data as St);
  }
  useEffect(() => { refresh(); }, [id]);

  async function updateCharger(cid: string, patch: Partial<Charger>) {
    setStation((prev) => prev ? { ...prev, chargers: (prev.chargers ?? []).map((c) => c.id === cid ? { ...c, ...patch } : c) } : prev);
    await fetch(`/api/chargers/${cid}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  }

  async function addCharger(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    await fetch("/api/chargers", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...nc, station_id: id, status: "online" }),
    });
    setAdding(false);
    setNc({ label: "", connector_type: "CCS2", power_kw: 60, price_per_kwh: 250 });
    refresh();
  }

  if (!station) return <div className="p-4 max-w-md mx-auto space-y-3"><Skeleton className="h-40" /></div>;

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <div>
        <div className="text-xs text-[var(--muted-foreground)]">{station.city}</div>
        <h1 className="text-2xl font-bold">{station.name}</h1>
        <div className="text-sm text-[var(--muted-foreground)]">{station.address}</div>
      </div>

      <div className="space-y-3">
        {(station.chargers ?? []).map((c) => (
          <motion.div key={c.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <Card>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2"><Zap className="h-5 w-5 text-emerald-600" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Charger {c.label}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{c.connector_type} · {c.power_kw} kW · {pricePerKwh(c.price_per_kwh)}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button key={s} onClick={() => updateCharger(c.id, { status: s })}
                        className={`text-xs px-2.5 py-1 rounded-full border capitalize
                          ${c.status === s ? "bg-emerald-500 text-white border-emerald-500" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Label>Price/kWh</Label>
                <Input className="h-8 w-24" type="number" defaultValue={c.price_per_kwh}
                  onBlur={(e) => updateCharger(c.id, { price_per_kwh: Number(e.currentTarget.value) })} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <div className="text-sm font-semibold mb-2 flex items-center gap-2"><Plus className="h-4 w-4" /> Add charger</div>
        <form onSubmit={addCharger} className="grid grid-cols-2 gap-2">
          <Input placeholder="Label (A1)" required value={nc.label} onChange={(e) => setNc({ ...nc, label: e.target.value })} />
          <select className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm" value={nc.connector_type} onChange={(e) => setNc({ ...nc, connector_type: e.target.value as Connector })}>
            {CONNECTORS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Input type="number" min={1} placeholder="kW" value={nc.power_kw} onChange={(e) => setNc({ ...nc, power_kw: Number(e.target.value) })} />
          <Input type="number" min={0} placeholder="₦/kWh" value={nc.price_per_kwh} onChange={(e) => setNc({ ...nc, price_per_kwh: Number(e.target.value) })} />
          <Button type="submit" className="col-span-2 w-full" disabled={adding}>{adding ? "Adding" : "Add charger"}</Button>
        </form>
      </Card>
    </div>
  );
}
