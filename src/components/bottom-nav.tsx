"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Map, Search, CalendarCheck, User,
  LayoutDashboard, Building2, CalendarRange, Settings,
  type LucideIcon,
} from "lucide-react";

const NAVS: Record<"driver" | "operator", { href: string; label: string; icon: LucideIcon }[]> = {
  driver: [
    { href: "/driver/map", label: "Map", icon: Map },
    { href: "/driver/search", label: "Search", icon: Search },
    { href: "/driver/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/driver/profile", label: "Profile", icon: User },
  ],
  operator: [
    { href: "/operator/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/operator/stations", label: "Stations", icon: Building2 },
    { href: "/operator/bookings", label: "Bookings", icon: CalendarRange },
    { href: "/operator/settings", label: "Settings", icon: Settings },
  ],
};

export function BottomNav({ role }: { role: "driver" | "operator" }) {
  const path = usePathname();
  const items = NAVS[role];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
      <div className="mx-auto max-w-md">
        <div className="m-3 rounded-2xl glass px-2 py-1.5 flex items-center justify-between" style={{ background: "var(--nav-bg)" }}>
          {items.map((it) => {
            const active = path === it.href || path.startsWith(it.href + "/");
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href} className="flex-1 flex items-center justify-center">
                <div className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl">
                  {active && (
                    <motion.div layoutId="nav-active" className="absolute inset-0 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                  )}
                  <Icon className={cn("h-5 w-5 relative", active ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted-foreground)]")} />
                  <span className={cn("text-[10px] font-medium relative", active ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted-foreground)]")}>{it.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
