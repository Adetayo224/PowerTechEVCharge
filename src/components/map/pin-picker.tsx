"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type { Map as LMap, Marker as LMarker } from "leaflet";

export default function PinPicker({ value, onChange }: { value: { lat: number; lng: number }; onChange: (p: { lat: number; lng: number }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { zoomControl: true }).setView([value.lat, value.lng], 12);
      }
      const url = resolved === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      L.tileLayer(url, { subdomains: "abcd" }).addTo(mapRef.current!);
      const icon = L.divIcon({ html: `<div style="width:26px;height:26px;border-radius:13px;background:#2F5BD3;border:2px solid #ffffff;box-shadow:0 4px 10px rgba(17,24,39,0.25)"></div>`, className: "", iconSize: [26, 26], iconAnchor: [13, 13] });
      markerRef.current = L.marker([value.lat, value.lng], { draggable: true, icon }).addTo(mapRef.current!);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        onChange({ lat: ll.lat, lng: ll.lng });
      });
      mapRef.current!.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        markerRef.current!.setLatLng([e.latlng.lat, e.latlng.lng]);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  return <div ref={ref} className="h-full w-full" />;
}
