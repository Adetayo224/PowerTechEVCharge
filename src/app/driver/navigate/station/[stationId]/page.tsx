"use client";
import { use, useEffect, useState } from "react";
import { NavigationView, NavigationSkeleton } from "@/components/navigation-view";
import { createClient } from "@/lib/supabase/browser";

type Station = { id: string; name: string; address: string; lat: number; lng: number };

export default function NavigateStationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params);
  const [station, setStation] = useState<Station | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("stations")
        .select("id, name, address, lat, lng")
        .eq("id", stationId)
        .maybeSingle();
      if (!data) setNotFound(true);
      else setStation(data as Station);
    })();
  }, [stationId]);

  if (notFound) {
    return <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">Station not found.</div>;
  }
  if (!station) return <NavigationSkeleton />;

  return (
    <NavigationView
      destination={{ id: station.id, name: station.name, address: station.address, lng: station.lng, lat: station.lat }}
      backHref="/driver/map"
      bookHref={`/driver/stations/${station.id}`}
    />
  );
}
