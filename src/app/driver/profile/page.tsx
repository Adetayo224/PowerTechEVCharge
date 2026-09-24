"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, LogOut, Download, Camera, Save } from "lucide-react";
import { motion } from "motion/react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  car_model: string | null;
  battery_kwh: number | null;
  efficiency_km_per_kwh: number | null;
  battery_percent: number | null;
  target_percent: number | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(data as Profile);
      }
    })();
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  async function save() {
    if (!profile) return;
    setSaving(true); setError(null); setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      car_model: profile.car_model,
      battery_kwh: profile.battery_kwh,
      efficiency_km_per_kwh: profile.efficiency_km_per_kwh,
      battery_percent: profile.battery_percent,
      target_percent: profile.target_percent ?? 80,
      avatar_url: profile.avatar_url,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) return setError(error.message);
    setStatus("Saved");
    setTimeout(() => setStatus(null), 2000);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 3 * 1024 * 1024) return setError("Please choose an image under 3 MB.");
    setUploading(true); setError(null);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); return setError(upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    set("avatar_url", url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    setUploading(false);
    setStatus("Photo updated");
    setTimeout(() => setStatus(null), 2000);
  }

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

  const initials = (profile?.full_name || email || "P").split(/\s+|@/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] font-bold flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base">{initials}</span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] shadow-sm"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{profile?.full_name || "Driver"}</div>
            <div className="text-xs text-[var(--muted-foreground)] truncate">{email}</div>
            {uploading && <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Uploading photo…</div>}
          </div>
        </div>
      </Card>

      {profile && (
        <Card className="space-y-3">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Personal</div>
          <div className="space-y-1.5">
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={profile.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={profile.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="080..." />
          </div>

          <div className="pt-3 border-t border-[var(--border)] space-y-3">
            <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Vehicle</div>
            <div className="space-y-1.5">
              <Label htmlFor="cm">Car model</Label>
              <Input id="cm" value={profile.car_model ?? ""} onChange={(e) => set("car_model", e.target.value)} placeholder="Hyundai Kona Electric" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="bk">Battery (kWh)</Label>
                <Input id="bk" inputMode="decimal" value={profile.battery_kwh ?? ""} onChange={(e) => set("battery_kwh", e.target.value ? Number(e.target.value) : null)} placeholder="64" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ef">km per kWh</Label>
                <Input id="ef" inputMode="decimal" value={profile.efficiency_km_per_kwh ?? ""} onChange={(e) => set("efficiency_km_per_kwh", e.target.value ? Number(e.target.value) : null)} placeholder="5.6" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp">Battery now (%)</Label>
                <Input id="bp" inputMode="numeric" value={profile.battery_percent ?? ""} onChange={(e) => set("battery_percent", e.target.value ? Number(e.target.value) : null)} placeholder="60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp">Target charge (%)</Label>
              <Input id="tp" inputMode="numeric" value={profile.target_percent ?? 80} onChange={(e) => set("target_percent", e.target.value ? Number(e.target.value) : 80)} placeholder="80" />
            </div>
          </div>

          {error && <div className="text-sm text-[var(--accent)]">{error}</div>}
          <div className="flex items-center gap-2 pt-1">
            <Button onClick={save} disabled={saving} className="flex-1"><Save className="h-4 w-4" /> {saving ? "Saving" : "Save changes"}</Button>
            {status && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--primary)] font-semibold">{status}</motion.span>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Theme</div>
        <div className="grid grid-cols-3 gap-2">
          {([{ v: "light", i: Sun }, { v: "system", i: Monitor }, { v: "dark", i: Moon }] as const).map(({ v, i: Icon }) => (
            <button key={v} onClick={() => setTheme(v)}
              className={`h-11 rounded-2xl border flex items-center justify-center gap-2 text-sm font-medium capitalize
                ${theme === v ? "bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] text-foreground"}`}>
              <Icon className="h-4 w-4" /> {v}
            </button>
          ))}
        </div>
      </Card>

      {installEvt && (
        <Button variant="outline" className="w-full" onClick={install}><Download className="h-4 w-4" /> Install app</Button>
      )}

      <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>

      <div className="text-center text-xs text-[var(--muted-foreground)] pt-4">
        PlugSpot · Built for PowerTech Nigeria
      </div>
    </div>
  );
}
