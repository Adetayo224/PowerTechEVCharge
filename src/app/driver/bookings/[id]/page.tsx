"use client";
import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, MapPin, Zap } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { formatSlotLong } from "@/lib/booking";
import { formatNaira } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";

type Booking = {
  id: string; reference: string; slot: string; status: string;
  estimated_cost: number; estimated_kwh: number;
  chargers: { label: string; connector_type: string; power_kw: number; stations: { name: string; address: string; lat: number; lng: number } };
};

function Inner({ id }: { id: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const isNew = sp.get("new") === "1";
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*, chargers(*, stations(*))")
        .eq("id", id).maybeSingle();
      setBooking(data as Booking);
      if (data?.reference) {
        const QR = (await import("qrcode")).default;
        const url = await QR.toDataURL(data.reference, { margin: 1, width: 220, color: { dark: "#047857", light: "#ffffff" } });
        setQrDataUrl(url);
      }
    })();
  }, [id]);

  async function cancel() {
    setCancelling(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }),
    });
    setCancelling(false);
    if (res.ok) router.push("/driver/bookings");
  }

  if (!booking) return <div className="p-4 max-w-md mx-auto space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  const start = new Date((booking.slot as string).split(",")[0].replace(/[\[\(]/, ""));

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4 pb-4">
      {isNew && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
            <Check className="h-10 w-10 text-emerald-600" />
          </motion.div>
        </motion.div>
      )}
      {isNew && <div className="text-center text-lg font-semibold">Booking confirmed</div>}

      <Card className="text-center">
        <div className="text-xs text-[var(--muted-foreground)]">Booking reference</div>
        <div className="mt-1 font-mono text-2xl font-bold tracking-widest">{booking.reference}</div>
        {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto mt-4 rounded-xl" />}
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2"><MapPin className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <div className="text-sm font-semibold">{booking.chargers.stations.name}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{booking.chargers.stations.address}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-[var(--muted-foreground)]">Charger</div><div className="font-medium flex items-center gap-1"><Zap className="h-4 w-4 text-emerald-600" /> {booking.chargers.label} · {booking.chargers.connector_type}</div></div>
          <div><div className="text-xs text-[var(--muted-foreground)]">When</div><div className="font-medium">{formatSlotLong(start)}</div></div>
          <div><div className="text-xs text-[var(--muted-foreground)]">Energy</div><div className="font-medium">{booking.estimated_kwh} kWh</div></div>
          <div><div className="text-xs text-[var(--muted-foreground)]">Cost</div><div className="font-bold">{formatNaira(booking.estimated_cost)}</div></div>
        </div>
      </Card>

      {booking.status === "confirmed" && start > new Date() && (
        <Button variant="outline" className="w-full" onClick={cancel} disabled={cancelling}>{cancelling ? "Cancelling" : "Cancel booking"}</Button>
      )}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<div className="p-4 max-w-md mx-auto"><Skeleton className="h-40" /></div>}><Inner id={id} /></Suspense>;
}
