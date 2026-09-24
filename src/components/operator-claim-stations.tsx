"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Building2, X, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

type Station = { id: string; name: string; address: string; city: string };

export function OperatorClaimStations() {
  const [open, setOpen] = useState(false);
  const [claimable, setClaimable] = useState<Station[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Does the operator already own a station?
        const { data: owned } = await supabase.from("stations").select("id").eq("owner_id", user.id).limit(1);
        if ((owned?.length ?? 0) > 0) return;
        const skipped = typeof window !== "undefined" && sessionStorage.getItem("plugspot.claim.skipped") === "1";
        if (skipped) return;
        const { data: pool, error: rpcErr } = await supabase.rpc("list_claimable_stations");
        if (rpcErr) return;
        const list = (pool as Station[]) ?? [];
        setClaimable(list);
        if (list.length > 0) {
          setSelected(list[0].id);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function claim() {
    if (!selected) return;
    setSaving(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("claim_station", { p_station_id: selected });
    setSaving(false);
    if (error) return setError(error.message);
    setOpen(false);
    // Refresh so operator dashboards etc. pick up the new station.
    if (typeof window !== "undefined") window.location.reload();
  }

  function skip() {
    if (typeof window !== "undefined") sessionStorage.setItem("plugspot.claim.skipped", "1");
    setOpen(false);
  }

  if (loading) return null;

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
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="w-full max-w-md float p-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={skip} aria-label="Skip" className="absolute right-3 top-3 h-8 w-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-semibold uppercase tracking-wider">
              <Building2 className="h-4 w-4" /> Select your station
            </div>
            <h2 className="mt-1 text-lg font-bold">Which station do you manage?</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              PlugSpot will route booking notifications to you for the station you pick. You can add more later.
            </p>

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor="station-select">Station</label>
              <select
                id="station-select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 text-sm text-foreground"
              >
                {claimable.map((s) => (
                  <option key={s.id} value={s.id}>{s.city} · {s.name}</option>
                ))}
              </select>
            </div>

            {error && <div className="mt-3 text-sm text-[var(--accent)]">{error}</div>}

            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={skip}>Skip for now</Button>
              <Button className="flex-1" onClick={claim} disabled={saving || !selected}><Check className="h-4 w-4" /> {saving ? "Claiming" : "Claim station"}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
