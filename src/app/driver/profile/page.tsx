"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, LogOut, Download } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/browser";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [installEvt, setInstallEvt] = useState<Event | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setName(data?.full_name ?? "");
      }
    })();
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function install() {
    if (installEvt && "prompt" in installEvt) {
      // @ts-expect-error prompt exists on BeforeInstallPromptEvent
      await installEvt.prompt();
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <div className="text-sm font-semibold">{name || "Driver"}</div>
        <div className="text-xs text-[var(--muted-foreground)]">{email}</div>
      </Card>

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

      {installEvt && (
        <Button variant="outline" className="w-full" onClick={install}><Download className="h-4 w-4" /> Install app</Button>
      )}

      <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
    </div>
  );
}
