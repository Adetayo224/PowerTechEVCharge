"use client";
import { motion } from "motion/react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function Cover() {
  const router = useRouter();
  return (
    <main className="min-h-dvh flex flex-col p-6 pt-16 safe-top safe-bottom bg-background">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <LogoMark size={72} />
        </motion.div>
        <motion.h1
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
          className="mt-6 text-4xl font-bold tracking-tight text-foreground"
        >
          PlugSpot
        </motion.h1>
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.12, ease: "easeOut" }}
          className="mt-3 text-base text-[var(--muted-foreground)] max-w-xs"
        >
          Find a charger. Book your slot. Drive on.
        </motion.p>
      </div>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.18, ease: "easeOut" }}
        className="w-full max-w-md mx-auto flex flex-col gap-3"
      >
        <Button size="lg" onClick={() => router.push("/sign-up?role=driver")}>I am a driver</Button>
        <Button size="lg" variant="outline" onClick={() => router.push("/sign-up?role=operator")}>
          I manage stations
        </Button>
        <button
          onClick={() => router.push("/sign-in")}
          className="mt-2 text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors"
        >
          Already have an account? Sign in
        </button>
        <div className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
          Built for PowerTech Nigeria
        </div>
      </motion.div>
    </main>
  );
}
