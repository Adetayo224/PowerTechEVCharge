"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Clock } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { formatSlot, formatSlotLong } from "@/lib/booking";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/browser";

type Slot = { start: string; end: string; available: boolean; reason?: string };

type Booking = {
  id: string;
  reference: string;
  slot: string;
  status: string;
  charger_id: string;
  chargers: { label: string; connector_type: string; power_kw: number; stations: { name: string; address: string } };
};

export default function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [dateIdx, setDateIdx] = useState(0);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*, chargers(label, connector_type, power_kw, stations(name, address))")
        .eq("id", id)
        .maybeSingle();
      setBooking(data as Booking);
    })();
  }, [id]);

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
    if (!booking) return;
    const dateStr = formatInTimeZone(days[dateIdx], "Africa/Lagos", "yyyy-MM-dd");
    setSlots(null); setSelected(null);
    fetch(`/api/availability?charger_id=${booking.charger_id}&date=${dateStr}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []));
  }, [booking, dateIdx, days]);

  async function submit() {
    if (!selected || !booking) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reschedule", start_time: selected.start }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not reschedule");
    router.push(`/driver/bookings/${booking.id}`);
  }

  if (!booking) return <div className="max-w-md mx-auto p-4 space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  const currentStart = new Date((booking.slot as string).split(",")[0].replace(/[\[\(]/, ""));

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <button onClick={() => history.back()} className="p-2 rounded-xl bg-[var(--surface)]"><ChevronLeft className="h-5 w-5" /></button>
        <div>
          <div className="text-xs text-[var(--muted-foreground)]">Reschedule</div>
          <div className="text-lg font-semibold">Booking {booking.reference}</div>
        </div>
      </div>

      <Card>
        <div className="text-xs text-[var(--muted-foreground)]">Current slot</div>
        <div className="text-sm font-semibold">{formatSlotLong(currentStart)}</div>
        <div className="text-xs text-[var(--muted-foreground)] mt-1">{booking.chargers.stations.name} · Charger {booking.chargers.label}</div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button key={i} onClick={() => setDateIdx(i)}
            className={`px-3 py-2 rounded-2xl text-xs min-w-[70px] border ${dateIdx === i ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
            <div className="opacity-80">{formatInTimeZone(d, "Africa/Lagos", "EEE")}</div>
            <div className="font-semibold">{formatInTimeZone(d, "Africa/Lagos", "dd MMM")}</div>
          </button>
        ))}
      </div>

      {slots === null ? (
        <div className="grid grid-cols-4 gap-2">{Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : slots.length === 0 ? (
        <Card>No hours on this day.</Card>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s) => {
            const label = formatSlot(new Date(s.start));
            const isSel = selected?.start === s.start;
            const isCurrent = new Date(s.start).getTime() === currentStart.getTime();
            return (
              <button key={s.start} disabled={!s.available || isCurrent} onClick={() => setSelected(s)}
                className={`h-10 rounded-xl text-xs font-medium border transition
                  ${isSel ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" :
                    isCurrent ? "bg-[var(--surface)] text-[var(--muted-foreground)] border-[var(--border)]" :
                    s.available ? "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]" :
                    "bg-[var(--surface)] text-[var(--muted-foreground)] border-transparent line-through opacity-60"}`}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted-foreground)]">New slot</div>
                  <div className="text-sm font-semibold flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatSlot(new Date(selected.start))} — {formatSlot(new Date(selected.end))}</div>
                </div>
              </div>
              {error && <div className="text-sm text-[var(--accent)] mt-3">{error}</div>}
              <Button className="mt-4 w-full" size="lg" onClick={submit} disabled={saving}>{saving ? "Rescheduling" : "Confirm reschedule"}</Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
