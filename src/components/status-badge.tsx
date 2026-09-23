import { Zap, PlugZap, Wrench } from "lucide-react";
import { Badge } from "@/components/ui";
import type { ChargerStatus } from "@/lib/supabase/types";

export function StatusBadge({ status }: { status: ChargerStatus }) {
  if (status === "online") return <Badge tone="primary"><Zap className="h-3.5 w-3.5" /> Online</Badge>;
  if (status === "unavailable") return <Badge tone="accent"><Wrench className="h-3.5 w-3.5" /> Unavailable</Badge>;
  return <Badge tone="neutral"><PlugZap className="h-3.5 w-3.5" /> Offline</Badge>;
}
