"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";
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
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setUnconfirmed(false); setResendStatus(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed") || msg.includes("confirm")) {
        setUnconfirmed(true);
        return setError("Your email is not confirmed yet. Please check your inbox.");
      }
      return setError(error.message);
    }
    router.push(next || "/");
    router.refresh();
  }

  async function resendConfirmation() {
    if (!email) return;
    setResending(true); setResendStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup", email,
      options: { emailRedirectTo: `${env.APP_URL}/auth/confirm` },
    });
    setResending(false);
    setResendStatus(error ? error.message : "Confirmation email sent again. Check your inbox.");
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
            {error && <div className="text-sm text-[var(--accent)]">{error}</div>}
            {unconfirmed && (
              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full" onClick={resendConfirmation} disabled={resending}>
                  {resending ? "Sending" : "Resend confirmation email"}
                </Button>
                {resendStatus && <div className="text-xs text-[var(--muted-foreground)] text-center">{resendStatus}</div>}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Signing in" : "Sign in"}</Button>
            <div className="flex items-center justify-between text-sm">
              <Link className="text-[var(--muted-foreground)]" href="/auth/forgot-password">Forgot password?</Link>
              <Link className="text-[var(--primary)] font-semibold" href="/sign-up">Create an account</Link>
            </div>
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Demo driver: driver@demo.powertech.ng<br />
          Demo operator: operator@demo.powertech.ng<br />
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
