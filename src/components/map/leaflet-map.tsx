"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type { Station, Charger } from "@/lib/supabase/types";
import type { Map as LMap, Marker as LMarker, TileLayer as LTileLayer } from "leaflet";

type StationWithChargers = Station & { chargers?: Charger[] };

export default function LeafletMap({
  stations,
  center,
  onStationClick,
}: {
  stations: StationWithChargers[];
  center?: { lat: number; lng: number };
  onStationClick?: (s: StationWithChargers) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const tileRef = useRef<LTileLayer | null>(null);
  const markersRef = useRef<LMarker[]>([]);
  const { resolved } = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { zoomControl: false }).setView([center?.lat ?? 6.5244, center?.lng ?? 3.3792], 11);
        L.control.zoom({ position: "topright" }).addTo(mapRef.current);
      }
      const url = resolved === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      if (tileRef.current) tileRef.current.remove();
      tileRef.current = L.tileLayer(url, {
        attribution: "© OpenStreetMap · © CARTO",
        subdomains: "abcd", maxZoom: 20,
      }).addTo(mapRef.current!);

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      for (const s of stations) {
        const onlineCount = (s.chargers ?? []).filter((c) => c.status === "online").length;
        const total = (s.chargers ?? []).length;
        const hasOnline = onlineCount > 0;
        const bg = hasOnline ? "#2F5BD3" : "#9CA3AF";
        const iconHtml = `
          <div class="plugspot-marker" style="position:relative;display:flex;align-items:center;justify-content:center">
            <div style="width:40px;height:40px;border-radius:20px;background:${bg};color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(17,24,39,0.20)">
              ${onlineCount}/${total}
            </div>
            ${hasOnline ? '<span class="marker-pulse" style="position:absolute;width:40px;height:40px;pointer-events:none;border-radius:20px"></span>' : ""}
          </div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
        const marker = L.marker([s.lat, s.lng], { icon }).addTo(mapRef.current!);
        marker.on("click", () => onStationClick?.(s));
        markersRef.current.push(marker);
      }
    })();
    return () => { cancelled = true; };
  }, [stations, center?.lat, center?.lng, resolved, onStationClick]);

  return <div ref={ref} className="h-full w-full" />;
}
