"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Car } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  car_model: string | null;
  battery_kwh: number | null;
  efficiency_km_per_kwh: number | null;
  battery_percent: number | null;
  target_percent: number | null;
};

export function VehiclePrompt() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [carModel, setCarModel] = useState("");
  const [batteryKwh, setBatteryKwh] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [batteryPercent, setBatteryPercent] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, car_model, battery_kwh, efficiency_km_per_kwh, battery_percent, target_percent")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return;
      setProfile(data as Profile);
      const skipped = typeof window !== "undefined" && sessionStorage.getItem("plugspot.vehicle.skipped") === "1";
      if (!data.car_model && !skipped) setOpen(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      car_model: carModel || null,
      battery_kwh: batteryKwh ? Number(batteryKwh) : null,
      efficiency_km_per_kwh: efficiency ? Number(efficiency) : null,
      battery_percent: batteryPercent ? Number(batteryPercent) : null,
      target_percent: profile.target_percent ?? 80,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) return setError(error.message);
    setOpen(false);
  }

  function skip() {
    if (typeof window !== "undefined") sessionStorage.setItem("plugspot.vehicle.skipped", "1");
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={skip}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="w-full max-w-md float p-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={skip} aria-label="Skip" className="absolute right-3 top-3 h-8 w-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-semibold uppercase tracking-wider">
              <Car className="h-4 w-4" /> Add your vehicle
            </div>
            <h2 className="mt-1 text-lg font-bold">Tell us about your car</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              This helps PlugSpot show your range and estimate charging time. You can update it later.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-model">Car model</Label>
                <Input id="v-model" required value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="Hyundai Kona Electric" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="v-bkwh">Battery (kWh)</Label>
                  <Input id="v-bkwh" inputMode="decimal" value={batteryKwh} onChange={(e) => setBatteryKwh(e.target.value.replace(/[^\d.]/g, ""))} placeholder="64" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-eff">km per kWh</Label>
                  <Input id="v-eff" inputMode="decimal" value={efficiency} onChange={(e) => setEfficiency(e.target.value.replace(/[^\d.]/g, ""))} placeholder="5.6" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-bpct">Battery now</Label>
                  <Input id="v-bpct" inputMode="numeric" value={batteryPercent} onChange={(e) => setBatteryPercent(e.target.value.replace(/\D/g, ""))} placeholder="60" />
                </div>
              </div>
              {error && <div className="text-sm text-[var(--accent)]">{error}</div>}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={skip}>Skip for now</Button>
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving" : "Save"}</Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
