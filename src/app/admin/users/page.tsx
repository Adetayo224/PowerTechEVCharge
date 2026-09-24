"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, Users } from "lucide-react";
import { Card, Input, Skeleton, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  car_model: string | null;
  created_at: string;
};

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "driver" | "operator" | "admin">("all");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("id, full_name, role, phone, car_model, created_at").order("created_at", { ascending: false });
      setProfiles((data as Profile[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!profiles) return null;
    const ql = q.toLowerCase();
    return profiles.filter((p) => {
      if (tab !== "all" && p.role !== tab) return false;
      if (!ql) return true;
      return (p.full_name ?? "").toLowerCase().includes(ql) || (p.phone ?? "").includes(ql) || p.id.includes(ql);
    });
  }, [profiles, q, tab]);

  return (
    <div className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="surface-muted p-1 grid grid-cols-4 gap-1">
        {(["all", "driver", "operator", "admin"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-9 rounded-lg text-xs font-semibold capitalize ${tab === t ? "bg-[var(--primary)] text-[var(--primary-fg)]" : "text-[var(--muted-foreground)]"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {profiles === null && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        {filtered?.length === 0 && <Card>No users match.</Card>}
        {filtered?.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{p.full_name || "Unnamed"}</div>
              <div className="text-xs text-[var(--muted-foreground)] truncate">
                {p.phone ? `${p.phone} · ` : ""}Joined {new Date(p.created_at).toLocaleDateString()}
                {p.car_model ? ` · ${p.car_model}` : ""}
              </div>
            </div>
            <Badge tone={p.role === "admin" ? "primary" : p.role === "operator" ? "accent" : "neutral"}>{p.role}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
