"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Button, Card, Input, Label } from "@/components/ui";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.APP_URL}/auth/confirm`,
    });
    setSending(false);
    if (error) return setError(error.message);
    router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=recovery`);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold">Forgot your password?</h1>
          <p className="text-sm text-[var(--muted-foreground)]">We will send you a reset link.</p>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            {error && <div className="text-sm text-[var(--accent)]">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={sending}>{sending ? "Sending" : "Send reset link"}</Button>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              <Link className="text-[var(--primary)] font-semibold" href="/sign-in">Back to sign in</Link>
            </p>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
