"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

function Inner() {
  const sp = useSearchParams();
  const email = sp.get("email") ?? "";
  const type = (sp.get("type") as "signup" | "recovery") ?? "signup";
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function resend() {
    if (cooldown || !email) return;
    setSending(true);
    setStatus(null);
    const supabase = createClient();
    const emailRedirectTo = `${env.APP_URL}/auth/confirm`;
    let error;
    if (type === "recovery") {
      ({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo }));
    } else {
      ({ error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } }));
    }
    setSending(false);
    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Email sent. Check your inbox.");
      setCooldown(60);
    }
  }

  const title = type === "recovery" ? "Check your email to reset your password" : "Check your email to confirm your account";
  const body = type === "recovery"
    ? "We sent a password reset link to your inbox."
    : "We sent a confirmation link to your inbox. Tap it to activate your account.";

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <Card className="text-center p-6">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
            <Mail className="h-8 w-8 text-emerald-600" />
          </motion.div>
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{body}</p>
          {email && <p className="mt-1 text-sm font-semibold">{email}</p>}
          {status && <p className="mt-3 text-xs text-[var(--muted-foreground)]">{status}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full" onClick={resend} disabled={sending || cooldown > 0 || !email}>
              {cooldown > 0 ? `Resend email in ${cooldown}s` : sending ? "Sending" : "Resend email"}
            </Button>
            <Link href="/sign-in"><Button variant="outline" className="w-full">Back to sign in</Button></Link>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
