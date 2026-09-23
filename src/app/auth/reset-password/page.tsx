"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button, Card, Input, Label } from "@/components/ui";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="p1">New password</Label><Input id="p1" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="p2">Confirm password</Label><Input id="p2" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={saving}>{saving ? "Saving" : "Update password"}</Button>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
