"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Zap, ChevronLeft } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { formatNaira, pricePerKwh } from "@/lib/utils";
import { estimateBookingCost, formatSlot } from "@/lib/booking";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type Slot = { start: string; end: string; available: boolean; reason?: string };
type Charger = { id: string; label: string; connector_type: string; power_kw: number; price_per_kwh: number; status: string };

export default function BookPage({ params }: { params: Promise<{ chargerId: string }> }) {
  const { chargerId } = use(params);
  const router = useRouter();
  const [dateIdx, setDateIdx] = useState(0);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0, 0, 0, 0);
      arr.push(d);
    }
    return arr;
  }, []);

  useEffect(() => {
    const dateStr = formatInTimeZone(days[dateIdx], "Africa/Lagos", "yyyy-MM-dd");
    setSlots(null); setSelected(null);
    fetch(`/api/availability?charger_id=${chargerId}&date=${dateStr}`).then((r) => r.json()).then((d) => {
      setCharger(d.charger);
      setSlots(d.slots ?? []);
    });
  }, [chargerId, dateIdx, days]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`book:${chargerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        const dateStr = formatInTimeZone(days[dateIdx], "Africa/Lagos", "yyyy-MM-dd");
        fetch(`/api/availability?charger_id=${chargerId}&date=${dateStr}`).then((r) => r.json()).then((d) => setSlots(d.slots ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chargerId, dateIdx, days]);

  const cost = charger ? estimateBookingCost(charger.power_kw, charger.price_per_kwh) : { kwh: 0, cost: 0 };

  async function book() {
    if (!selected) return;
    setSubmitting(true); setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ charger_id: chargerId, start_time: selected.start }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error || "Could not book");
    router.push(`/driver/bookings/${data.booking.id}?new=1`);
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <button onClick={() => history.back()} className="p-2 rounded-xl bg-[var(--surface)]"><ChevronLeft className="h-5 w-5" /></button>
        <div>
          <div className="text-xs text-[var(--muted-foreground)]">Select a slot</div>
          <div className="text-lg font-semibold">Charger {charger?.label ?? "…"}</div>
        </div>
      </div>

      {charger && (
        <Card className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--primary-soft)] p-2"><Zap className="h-5 w-5 text-[var(--primary)]" /></div>
          <div className="text-sm">
            <div className="font-medium">{charger.connector_type} · {charger.power_kw} kW</div>
            <div className="text-[var(--muted-foreground)]">{pricePerKwh(charger.price_per_kwh)}</div>
          </div>
          <div className="ml-auto text-right text-xs text-[var(--muted-foreground)]">Estimated<br /><span className="text-foreground font-semibold text-sm">{formatNaira(cost.cost)}</span></div>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button key={i} onClick={() => setDateIdx(i)}
            className={`px-3 py-2 rounded-2xl text-xs min-w-[70px] border ${dateIdx === i ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
            <div className="opacity-80">{formatInTimeZone(d, "Africa/Lagos", "EEE")}</div>
            <div className="font-semibold">{formatInTimeZone(d, "Africa/Lagos", "dd MMM")}</div>
          </button>
        ))}
      </div>

      <div>
        {slots === null ? (
          <div className="grid grid-cols-4 gap-2">{Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : slots.length === 0 ? (
          <Card>No hours on this day.</Card>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => {
              const label = formatSlot(new Date(s.start));
              const isSel = selected?.start === s.start;
              return (
                <button key={s.start} disabled={!s.available} onClick={() => setSelected(s)}
                  className={`h-10 rounded-xl text-xs font-medium border transition
                    ${isSel ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" :
                      s.available ? "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]" :
                      "bg-[var(--surface)] text-[var(--muted-foreground)] border-transparent line-through opacity-60"}`}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted-foreground)]">Slot</div>
                  <div className="text-sm font-semibold">{formatSlot(new Date(selected.start))} — {formatSlot(new Date(selected.end))}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--muted-foreground)]">Total</div>
                  <div className="text-base font-bold">{formatNaira(cost.cost)}</div>
                </div>
              </div>
              {error && <div className="text-sm text-[var(--accent)] mt-3">{error}</div>}
              <Button className="mt-4 w-full" size="lg" onClick={book} disabled={submitting}>
                {submitting ? "Booking" : "Confirm booking"}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center text-xs text-[var(--muted-foreground)]">
        <Link href="/driver/map">Back to map</Link>
      </div>
    </div>
  );
}
