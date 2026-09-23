"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, Marker as MLMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/components/theme-provider";

export type MapStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  online: number;
  total: number;
  waiting?: number;
};

export type CarMarker = {
  lng: number;
  lat: number;
  bearing?: number;
};

export type RouteLine = {
  geometry: GeoJSON.LineString;
  bounds?: [number, number, number, number];
};

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/liberty";

function stationMarkerEl(s: MapStation) {
  const wrap = document.createElement("div");
  wrap.className = "plug-station-marker";
  const hasOnline = s.online > 0;
  const bg = hasOnline ? "#2F5BD3" : "#9CA3AF";
  const busy = (s.waiting ?? 0) > 0;
  wrap.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer";
  wrap.innerHTML = `
    <div style="width:40px;height:40px;border-radius:20px;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 4px 12px rgba(17,24,39,0.20)">${s.online}/${s.total}</div>
    ${busy ? '<span style="position:absolute;top:-4px;right:-4px;background:#D14343;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:8px;border:2px solid #fff">' + s.waiting + '</span>' : ''}
    ${hasOnline ? '<span class="plug-pulse" style="position:absolute;width:40px;height:40px;pointer-events:none;border-radius:20px"></span>' : ''}
  `;
  return wrap;
}

function carMarkerEl(bearing = 0) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform:rotate(" + bearing + "deg);transition:transform 250ms linear";
  wrap.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#fff" stroke="#2F5BD3" stroke-width="2"/>
      <path d="M18 6 L26 22 L18 18 L10 22 Z" fill="#2F5BD3"/>
    </svg>`;
  return wrap;
}

type Props = {
  stations: MapStation[];
  car?: CarMarker | null;
  center?: { lng: number; lat: number };
  zoom?: number;
  bearing?: number;
  pitch?: number;
  interactive?: boolean;
  onMapClick?: (lng: number, lat: number) => void;
  onStationClick?: (id: string) => void;
  route?: RouteLine | null;
  followCar?: boolean;
  className?: string;
};

export default function PlugMap({
  stations,
  car,
  center,
  zoom = 12,
  bearing = 0,
  pitch = 0,
  interactive = true,
  onMapClick,
  onStationClick,
  route,
  followCar = false,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const stationMarkersRef = useRef<Map<string, MLMarker>>(new Map());
  const carMarkerRef = useRef<MLMarker | null>(null);
  const carElRef = useRef<HTMLElement | null>(null);
  const styleReadyRef = useRef(false);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: resolved === "dark" ? STYLE_DARK : STYLE_LIGHT,
      center: [center?.lng ?? 3.4735, center?.lat ?? 6.4396],
      zoom,
      bearing,
      pitch,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => { styleReadyRef.current = true; });
    if (onMapClick) map.on("click", (e) => onMapClick(e.lngLat.lng, e.lngLat.lat));
    return () => {
      map.remove();
      mapRef.current = null;
      styleReadyRef.current = false;
      stationMarkersRef.current.clear();
      carMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme swap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(resolved === "dark" ? STYLE_DARK : STYLE_LIGHT);
    styleReadyRef.current = false;
    map.once("styledata", () => {
      styleReadyRef.current = true;
      // Reapply route after style swap
      if (route) applyRoute(map, route);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  // Camera updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (center) map.easeTo({ center: [center.lng, center.lat], zoom, bearing, pitch, duration: 400 });
    else map.easeTo({ zoom, bearing, pitch, duration: 400 });
  }, [center?.lng, center?.lat, zoom, bearing, pitch]);

  // Station markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = stationMarkersRef.current;
    const nextIds = new Set(stations.map((s) => s.id));
    // Remove stale
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
    // Add / update
    for (const s of stations) {
      const el = stationMarkerEl(s);
      if (onStationClick) el.addEventListener("click", (e) => { e.stopPropagation(); onStationClick(s.id); });
      const existingMarker = existing.get(s.id);
      if (existingMarker) {
        existingMarker.getElement().replaceWith(el);
        existingMarker.setLngLat([s.lng, s.lat]);
        // Replace internal element reference (hacky but works: recreate)
        existingMarker.remove();
        existing.delete(s.id);
      }
      const m = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
      existing.set(s.id, m);
    }
  }, [stations, onStationClick]);

  // Car marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (car) {
      if (!carMarkerRef.current) {
        const el = carMarkerEl(car.bearing ?? 0);
        carElRef.current = el;
        carMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([car.lng, car.lat]).addTo(map);
      } else {
        carMarkerRef.current.setLngLat([car.lng, car.lat]);
        if (carElRef.current) carElRef.current.style.transform = `rotate(${car.bearing ?? 0}deg)`;
      }
      if (followCar) {
        map.easeTo({ center: [car.lng, car.lat], bearing: car.bearing ?? map.getBearing(), duration: 350, essential: true });
      }
    } else if (carMarkerRef.current) {
      carMarkerRef.current.remove();
      carMarkerRef.current = null;
      carElRef.current = null;
    }
  }, [car?.lng, car?.lat, car?.bearing, followCar]);

  // Route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => { if (route) applyRoute(map, route); else clearRoute(map); };
    if (styleReadyRef.current) apply();
    else map.once("styledata", apply);
  }, [route]);

  return <div ref={ref} className={className ?? "h-full w-full"} />;
}

function applyRoute(map: MLMap, route: RouteLine) {
  const id = "plugspot-route";
  const geojson = { type: "Feature" as const, properties: {}, geometry: route.geometry };
  const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (src) {
    src.setData(geojson);
  } else {
    map.addSource(id, { type: "geojson", data: geojson });
    map.addLayer({
      id: id + "-casing",
      type: "line",
      source: id,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 8 },
    });
    map.addLayer({
      id,
      type: "line",
      source: id,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2F5BD3", "line-width": 5 },
    });
  }
  if (route.bounds) {
    const [minLng, minLat, maxLng, maxLat] = route.bounds;
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, duration: 400 });
  }
}

function clearRoute(map: MLMap) {
  const id = "plugspot-route";
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getLayer(id + "-casing")) map.removeLayer(id + "-casing");
  if (map.getSource(id)) map.removeSource(id);
}
