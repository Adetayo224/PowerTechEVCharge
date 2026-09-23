"use client";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, LogOut } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/browser";

export default function OperatorSettings() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <div className="text-xs text-[var(--muted-foreground)] mb-2">Theme</div>
        <div className="grid grid-cols-3 gap-2">
          {([{ v: "light", i: Sun }, { v: "system", i: Monitor }, { v: "dark", i: Moon }] as const).map(({ v, i: Icon }) => (
            <button key={v} onClick={() => setTheme(v)}
              className={`h-11 rounded-2xl border flex items-center justify-center gap-2 text-sm font-medium capitalize
                ${theme === v ? "bg-emerald-500 text-white border-emerald-500" : "border-[var(--border)] bg-[var(--card)] text-foreground"}`}>
              <Icon className="h-4 w-4" /> {v}
            </button>
          ))}
        </div>
      </Card>
      <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>

      <div className="text-center text-xs text-[var(--muted-foreground)] pt-4">
        PlugSpot · Built for PowerTech Nigeria
      </div>
    </div>
  );
}
