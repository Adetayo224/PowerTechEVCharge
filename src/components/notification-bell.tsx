"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setItems(j.notifications ?? []);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => [payload.new as Notif, ...prev].slice(0, 50));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ read_all: true }),
    });
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-foreground hover:bg-[var(--surface)]"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--background)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 max-h-[70vh] float overflow-hidden flex flex-col"
            >
              <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                <div className="text-sm font-semibold">Notifications</div>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1">
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 && (
                  <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">No notifications yet.</div>
                )}
                {items.map((n) => {
                  const stationId = typeof n.data?.station_id === "string" ? n.data.station_id : undefined;
                  const href = stationId ? `/operator/stations/${stationId}` : `/operator/bookings`;
                  const when = new Date(n.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
                  return (
                    <Link key={n.id} href={href} onClick={() => setOpen(false)} className="block p-3 border-b border-[var(--border)] hover:bg-[var(--surface)]">
                      <div className="flex items-start gap-2">
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.read_at ? "bg-transparent" : "bg-[var(--primary)]"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{n.title}</div>
                          {n.body && <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{n.body}</div>}
                          <div className="text-[10px] text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                            <span>{when}</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
