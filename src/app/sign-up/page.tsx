"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";
import { Logo } from "@/components/logo";
import { Button, Card, Input, Label } from "@/components/ui";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name, role, phone },
        emailRedirectTo: `${env.APP_URL}/auth/confirm`,
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=signup`);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["driver","operator"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`h-11 rounded-2xl border text-sm font-semibold ${role===r ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
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
              <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Creating" : "Create account"}</Button>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              Already have an account? <Link className="text-emerald-600 dark:text-emerald-400 font-semibold" href="/sign-in">Sign in</Link>
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
