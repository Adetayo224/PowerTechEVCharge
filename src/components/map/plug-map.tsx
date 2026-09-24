"use client";
import type { LineString } from "geojson";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Layers, Sun, Moon, Globe2, Mountain, Check } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// MapLibre GL is loaded from a CDN via <Script> at runtime. Bundling maplibre-gl
// through Turbopack triggers a module-worker chain whose imports get rewritten
// and then redirected, and browsers refuse Worker scripts that were redirected.
// Loading the UMD build from a CDN sidesteps that entirely.

type MaplibreGlobal = {
  Map: new (options: Record<string, unknown>) => MLMapInstance;
  Marker: new (options: Record<string, unknown>) => MLMarkerInstance;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
};

type MLMapInstance = {
  on: (event: string, handler: (e?: unknown) => void) => void;
  once: (event: string, handler: () => void) => void;
  addControl: (control: unknown, position?: string) => void;
  remove: () => void;
  setStyle: (style: string | Record<string, unknown>) => void;
  easeTo: (options: Record<string, unknown>) => void;
  getBearing: () => number;
  getSource: (id: string) => { setData: (d: unknown) => void } | undefined;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  fitBounds: (bounds: [[number, number], [number, number]], options: Record<string, unknown>) => void;
};

type MLMarkerInstance = {
  setLngLat: (coord: [number, number]) => MLMarkerInstance;
  addTo: (map: MLMapInstance) => MLMarkerInstance;
  remove: () => void;
  getElement: () => HTMLElement;
};

declare global {
  interface Window {
    maplibregl?: MaplibreGlobal;
  }
}

const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

export type MapStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  online: number;
  total: number;
  waiting?: number;
};

export type CarMarker = { lng: number; lat: number; bearing?: number };
export type RouteLine = { geometry: LineString; bounds?: [number, number, number, number] };
export type Basemap = "streets" | "dark" | "satellite" | "terrain";

const STREETS_URL = "https://tiles.openfreemap.org/styles/positron";

function rasterStyle(source: { tiles: string[]; attribution: string; maxzoom?: number }) {
  return {
    version: 8,
    sources: {
      raster: {
        type: "raster",
        tiles: source.tiles,
        tileSize: 256,
        maxzoom: source.maxzoom ?? 19,
        attribution: source.attribution,
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#e5e7eb" } },
      { id: "raster", type: "raster", source: "raster" },
    ],
  } as unknown as Record<string, unknown>;
}

function styleFor(basemap: Basemap): string | Record<string, unknown> {
  if (basemap === "satellite") {
    return rasterStyle({
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      maxzoom: 19,
      attribution: "© Esri, Maxar, Earthstar Geographics",
    });
  }
  if (basemap === "terrain") {
    return rasterStyle({
      tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
      maxzoom: 17,
      attribution: "© OpenStreetMap contributors, © OpenTopoMap (CC BY SA)",
    });
  }
  return STREETS_URL;
}

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
  wrap.style.cssText = "width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform:rotate(" + bearing + "deg);transition:transform 300ms linear";
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
  showBasemapSwitcher?: boolean;
  initialBasemap?: Basemap;
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
  showBasemapSwitcher = true,
  initialBasemap,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMapInstance | null>(null);
  const stationMarkersRef = useRef<Map<string, MLMarkerInstance>>(new Map());
  const carMarkerRef = useRef<MLMarkerInstance | null>(null);
  const carElRef = useRef<HTMLElement | null>(null);
  const styleReadyRef = useRef(false);
  const [ready, setReady] = useState<boolean>(typeof window !== "undefined" && !!window.maplibregl);
  const { resolved } = useTheme();
  const [basemap, setBasemap] = useState<Basemap>(initialBasemap ?? (resolved === "dark" ? "dark" : "streets"));
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Init once maplibregl is on window
  useEffect(() => {
    if (!ready || !ref.current || mapRef.current || typeof window === "undefined" || !window.maplibregl) return;
    const ml = window.maplibregl;
    const map = new ml.Map({
      container: ref.current,
      style: styleFor(basemap),
      center: [center?.lng ?? 3.4735, center?.lat ?? 6.4396],
      zoom,
      bearing,
      pitch,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new ml.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.on("load", () => { styleReadyRef.current = true; });
    map.on("error", (e: unknown) => { const err = e as { error?: { message?: string } }; console.warn("[map]", err?.error?.message ?? err); });
    if (onMapClick) map.on("click", (e: unknown) => {
      const evt = e as { lngLat: { lng: number; lat: number } };
      onMapClick(evt.lngLat.lng, evt.lngLat.lat);
    });
    return () => {
      map.remove();
      mapRef.current = null;
      styleReadyRef.current = false;
      stationMarkersRef.current.clear();
      carMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Theme sync
  useEffect(() => {
    if (basemap === "satellite" || basemap === "terrain") return;
    setBasemap(resolved === "dark" ? "dark" : "streets");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  // Style swap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    styleReadyRef.current = false;
    map.setStyle(styleFor(basemap));
    map.once("styledata", () => {
      styleReadyRef.current = true;
      if (route) applyRoute(map, route);
    });
  }, [basemap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (center) map.easeTo({ center: [center.lng, center.lat], zoom, bearing, pitch, duration: 400 });
    else map.easeTo({ zoom, bearing, pitch, duration: 400 });
  }, [center?.lng, center?.lat, zoom, bearing, pitch]);

  // Station markers
  useEffect(() => {
    const map = mapRef.current;
    const ml = typeof window !== "undefined" ? window.maplibregl : undefined;
    if (!map || !ml) return;
    const existing = stationMarkersRef.current;
    const nextIds = new Set(stations.map((s) => s.id));
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) { marker.remove(); existing.delete(id); }
    }
    for (const s of stations) {
      const el = stationMarkerEl(s);
      if (onStationClick) el.addEventListener("click", (e) => { e.stopPropagation(); onStationClick(s.id); });
      const prior = existing.get(s.id);
      if (prior) { prior.remove(); existing.delete(s.id); }
      const m = new ml.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
      existing.set(s.id, m);
    }
  }, [stations, onStationClick]);

  // Car marker
  useEffect(() => {
    const map = mapRef.current;
    const ml = typeof window !== "undefined" ? window.maplibregl : undefined;
    if (!map || !ml) return;
    if (car) {
      if (!carMarkerRef.current) {
        const el = carMarkerEl(car.bearing ?? 0);
        carElRef.current = el;
        carMarkerRef.current = new ml.Marker({ element: el }).setLngLat([car.lng, car.lat]).addTo(map);
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

  const isDarkOverlay = basemap === "dark";

  return (
    <div className={className ?? "relative h-full w-full"} style={{ position: "relative", minHeight: 200 }}>
      <link rel="stylesheet" href={MAPLIBRE_CSS} />
      <Script
        src={MAPLIBRE_JS}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div
        ref={ref}
        className={"absolute inset-0" + (isDarkOverlay ? " plug-map-dark" : "")}
      />
      {showBasemapSwitcher && (
        <div className="absolute bottom-3 left-3 z-10">
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="h-9 w-9 rounded-lg bg-white text-[#111827] border border-[#E5E7EB] shadow-sm flex items-center justify-center hover:bg-[#F7F8FA]"
              aria-label="Choose basemap"
            >
              <Layers className="h-4 w-4" />
            </button>
            {switcherOpen && (
              <div className="absolute bottom-11 left-0 min-w-[168px] rounded-xl bg-white border border-[#E5E7EB] shadow-lg overflow-hidden">
                {(["streets", "dark", "satellite", "terrain"] as Basemap[]).map((b) => {
                  const Icon = BASEMAP_ICON[b];
                  const active = basemap === b;
                  return (
                    <button
                      key={b}
                      onClick={() => { setBasemap(b); setSwitcherOpen(false); }}
                      className={`w-full h-10 px-3 flex items-center gap-2 text-sm text-left ${active ? "bg-[#EEF2FB] text-[#2F5BD3]" : "text-[#111827] hover:bg-[#F7F8FA]"}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 font-medium">{BASEMAP_LABEL[b]}</span>
                      {active && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BASEMAP_LABEL: Record<Basemap, string> = {
  streets: "Streets",
  dark: "Dark",
  satellite: "Satellite",
  terrain: "Terrain",
};
const BASEMAP_ICON: Record<Basemap, typeof Sun> = {
  streets: Sun,
  dark: Moon,
  satellite: Globe2,
  terrain: Mountain,
};

function applyRoute(map: MLMapInstance, route: RouteLine) {
  const id = "plugspot-route";
  const geojson = { type: "Feature" as const, properties: {}, geometry: route.geometry };
  const src = map.getSource(id);
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
    try {
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, duration: 400 });
    } catch { /* noop */ }
  }
}

function clearRoute(map: MLMapInstance) {
  const id = "plugspot-route";
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getLayer(id + "-casing")) map.removeLayer(id + "-casing");
  if (map.getSource(id)) map.removeSource(id);
}
