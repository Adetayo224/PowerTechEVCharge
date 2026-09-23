"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, MapPin } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";
import type { Charger, Station } from "@/lib/supabase/types";

type St = Station & { chargers?: Charger[] };

export default function OperatorStations() {
  const [stations, setStations] = useState<St[] | null>(null);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("stations").select("*, chargers(*)").order("created_at", { ascending: false });
      setStations((data as St[]) ?? []);
    })();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stations</h1>
        <Link href="/operator/stations/new"><Button size="sm"><Plus className="h-4 w-4" /> New</Button></Link>
      </div>
      <div className="space-y-3">
        {stations === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {stations?.length === 0 && <Card>No stations yet. Tap New to add your first.</Card>}
        {stations?.map((s, i) => (
          <motion.div key={s.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
            <Link href={`/operator/stations/${s.id}`}>
              <Card className="flex items-center gap-3">
                <div className="rounded-xl bg-[var(--primary-soft)] p-2"><MapPin className="h-5 w-5 text-[var(--primary)]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate">{s.address}</div>
                  <div className="text-xs mt-1">{(s.chargers ?? []).length} chargers</div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
