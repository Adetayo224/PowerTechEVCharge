"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/logo";
import { Button, Card, Input, Label } from "@/components/ui";
import Link from "next/link";

function SignInInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(next || "/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Sign in to continue</p>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Signing in" : "Sign in"}</Button>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              New here? <Link className="text-emerald-600 dark:text-emerald-400 font-semibold" href="/sign-up">Create an account</Link>
            </p>
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Demo driver: driver@demo.samfred.com<br />
          Demo operator: operator@demo.samfred.com<br />
          Password: Demo1234!
        </p>
      </motion.div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
