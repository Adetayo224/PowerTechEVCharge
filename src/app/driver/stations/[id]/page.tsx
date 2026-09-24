"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Navigation2, ExternalLink, Zap } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { pricePerKwh } from "@/lib/utils";
import type { Charger, Station } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/browser";

type St = Station & { chargers?: Charger[] };

export default function StationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [station, setStation] = useState<St | null>(null);

  useEffect(() => {
    fetch(`/api/stations/${id}`).then((r) => r.json()).then((d) => setStation(d.station));
    const supabase = createClient();
    const ch = supabase
      .channel(`chargers:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chargers" }, (payload) => {
        setStation((prev) => {
          if (!prev) return prev;
          const chargers = (prev.chargers ?? []).map((c) => c.id === payload.new.id ? { ...c, ...payload.new as Charger } : c);
          return { ...prev, chargers };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!station) return <div className="p-4 space-y-3 max-w-md mx-auto"><Skeleton className="h-40" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4 pb-4">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
        <div className="surface p-5">
          <div className="text-xs text-[var(--muted-foreground)]">{station.city}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{station.name}</div>
        </div>
      </motion.div>

      <Card>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-[var(--primary)] mt-0.5" />
          <div className="flex-1">
            <div className="text-sm">{station.address}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/driver/navigate/station/${station.id}`}>
                <Button size="sm"><Navigation2 className="h-4 w-4" /> Navigate</Button>
              </Link>
              <a target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}>
                <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Open in Google Maps</Button>
              </a>
            </div>
          </div>
        </div>
        {station.amenities?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {station.amenities.map((a) => <span key={a} className="text-xs bg-[var(--surface)] rounded-full px-2 py-1">{a}</span>)}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <div className="text-sm font-semibold px-1">Chargers</div>
        {(station.chargers ?? []).map((c, i) => (
          <motion.div key={c.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
            <Card className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--primary-soft)] p-2"><Zap className="h-5 w-5 text-[var(--primary)]" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Charger {c.label} · {c.connector_type}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{c.power_kw} kW · {pricePerKwh(c.price_per_kwh)}</div>
                <div className="mt-1"><StatusBadge status={c.status} /></div>
              </div>
              {c.status === "online" ? (
                <Link href={`/driver/book/${c.id}`}>
                  <Button size="sm">Book</Button>
                </Link>
              ) : (
                <Button size="sm" variant="outline" disabled>Book</Button>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
