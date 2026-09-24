"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";
import { Logo } from "@/components/logo";
import { Button, Card, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import Link from "next/link";

function SignUpInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialRole = (sp.get("role") === "operator" ? "operator" : "driver") as "driver" | "operator";
  const [role, setRole] = useState<"driver" | "operator">(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [carModel, setCarModel] = useState("");
  const [batteryKwh, setBatteryKwh] = useState<string>("");
  const [efficiency, setEfficiency] = useState<string>("");
  const [batteryPercent, setBatteryPercent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const meta: Record<string, unknown> = { full_name: name, role, phone };
    if (role === "driver") {
      if (carModel) meta.car_model = carModel;
      if (batteryKwh) meta.battery_kwh = Number(batteryKwh);
      if (efficiency) meta.efficiency_km_per_kwh = Number(efficiency);
      if (batteryPercent) meta.battery_percent = Number(batteryPercent);
      meta.target_percent = 80;
    }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: meta,
        emailRedirectTo: `${env.APP_URL}/auth/confirm`,
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=signup`);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 py-10 safe-top safe-bottom">
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["driver","operator"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`h-11 rounded-2xl border text-sm font-semibold ${role===r ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
                  {r === "driver" ? "Driver" : "Station operator"}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Driver" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>

            {role === "driver" && (
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Your vehicle (you can skip and fill later)</div>
                <div className="space-y-1.5">
                  <Label htmlFor="car">Car model</Label>
                  <Input id="car" value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="Hyundai Kona Electric" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="bkwh">Battery (kWh)</Label>
                    <Input id="bkwh" inputMode="decimal" value={batteryKwh} onChange={(e) => setBatteryKwh(e.target.value.replace(/[^\d.]/g, ""))} placeholder="64" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eff">km per kWh</Label>
                    <Input id="eff" inputMode="decimal" value={efficiency} onChange={(e) => setEfficiency(e.target.value.replace(/[^\d.]/g, ""))} placeholder="5.6" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bpct">Battery now</Label>
                    <Input id="bpct" inputMode="numeric" value={batteryPercent} onChange={(e) => setBatteryPercent(e.target.value.replace(/\D/g, ""))} placeholder="60" />
                  </div>
                </div>
              </div>
            )}

            {error && <div className="text-sm text-[var(--accent)]">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Creating" : "Create account"}</Button>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              Already have an account? <Link className="text-[var(--primary)] font-semibold" href="/sign-in">Sign in</Link>
            </p>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}

export default function Page() {
  return <Suspense><SignUpInner /></Suspense>;
}
