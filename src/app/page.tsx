"use client";
import { motion } from "motion/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function Cover() {
  const router = useRouter();
  return (
    <main className="min-h-dvh flex flex-col items-center justify-between p-6 pt-16 safe-top safe-bottom bg-gradient-to-b from-white to-emerald-50 dark:from-[#0a0a0a] dark:to-[#0b1a15]">
      <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 20 }}>
          <Logo size={96} />
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="mt-6 text-4xl font-bold tracking-tight">
          <span className="text-gradient">PlugSpot</span>
        </motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3 text-base text-[var(--muted-foreground)]">
          Find a charger. Book your slot. Drive on.
        </motion.p>
      </div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="w-full max-w-md flex flex-col gap-3">
        <Button size="lg" onClick={() => router.push("/sign-up?role=driver")}>I am a driver</Button>
        <Button size="lg" variant="outline" onClick={() => router.push("/sign-up?role=operator")}>I manage stations</Button>
        <button onClick={() => router.push("/sign-in")} className="mt-2 text-sm text-[var(--muted-foreground)] hover:text-foreground">
          Already have an account? Sign in
        </button>
      </motion.div>
    </main>
  );
}
