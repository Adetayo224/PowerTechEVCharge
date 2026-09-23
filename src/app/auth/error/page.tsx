"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";

function Inner() {
  const sp = useSearchParams();
  const reason = sp.get("reason");
  const message = sp.get("message");

  const friendly = reason === "missing_token"
    ? "That confirmation link was incomplete. Please request a new email."
    : reason === "verify_failed"
    ? "This confirmation link has expired or was already used. Ask for a fresh one."
    : "Something went wrong verifying that link.";

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <Card className="text-center p-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Verification could not complete</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{friendly}</p>
          {message && <p className="mt-2 text-xs text-[var(--muted-foreground)]">{message}</p>}
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/sign-in"><Button className="w-full">Back to sign in</Button></Link>
            <Link href="/sign-up"><Button variant="outline" className="w-full">Create a new account</Button></Link>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
