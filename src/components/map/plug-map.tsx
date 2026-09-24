"use client";
import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import type { LineString } from "geojson";
import { Layers, Sun, Moon, Globe2, Mountain, Check } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// Leaflet is a battle-tested, worker-free map library. We use it with plain
// raster tile providers so nothing in the toolchain can rewrite worker imports
// through redirected paths. All four basemaps are keyless.

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

// Every entry has an explicit subdomains string. Leaflet's TileLayer default
// is "abc", but when Leaflet is loaded via the ESM build inside a bundler that
// default sometimes gets stripped and _getSubdomain() throws
// "Cannot read properties of undefined (reading 'length')" on the first tile.
// Passing an explicit value keeps that fatal path closed even when the URL
// template has no {s} placeholder.
const TILES: Record<Basemap, { url: string; attribution: string; maxZoom: number; subdomains: string; dark?: boolean }> = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    subdomains: "abc",
  },
  dark: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    subdomains: "abc",
    dark: true,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
    subdomains: "abc",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors, © OpenTopoMap (CC BY SA)",
    maxZoom: 17,
    subdomains: "abc",
  },
};

function stationMarkerHTML(s: MapStation) {
  const hasOnline = s.online > 0;
  const bg = hasOnline ? "#2F5BD3" : "#9CA3AF";
  const busy = (s.waiting ?? 0) > 0;
  return `
    <div class="plug-station-marker" style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer">
      <div style="width:40px;height:40px;border-radius:20px;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 4px 12px rgba(17,24,39,0.20)">${s.online}/${s.total}</div>
      ${busy ? '<span style="position:absolute;top:-4px;right:-4px;background:#D14343;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:8px;border:2px solid #fff">' + s.waiting + '</span>' : ""}
      ${hasOnline ? '<span class="plug-pulse" style="position:absolute;width:40px;height:40px;pointer-events:none;border-radius:20px"></span>' : ""}
    </div>`;
}

function carMarkerHTML(bearing = 0) {
  return `
    <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform:rotate(${bearing}deg);transition:transform 300ms linear">
      <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="16" fill="#fff" stroke="#2F5BD3" stroke-width="2"/>
        <path d="M18 6 L26 22 L18 18 L10 22 Z" fill="#2F5BD3"/>
      </svg>
    </div>`;
}

type Props = {
  stations: MapStation[];
  car?: CarMarker | null;
  center?: { lng: number; lat: number };
  zoom?: number;
  interactive?: boolean;
  onMapClick?: (lng: number, lat: number) => void;
  onStationClick?: (id: string) => void;
  route?: RouteLine | null;
  followCar?: boolean;
  className?: string;
  showBasemapSwitcher?: boolean;
  initialBasemap?: Basemap;
};

type LeafletMap = ReturnType<typeof L.map>;
type LeafletMarker = ReturnType<typeof L.marker>;
type LeafletTileLayer = ReturnType<typeof L.tileLayer>;
type LeafletPolyline = ReturnType<typeof L.polyline>;

export default function PlugMap({
  stations,
  car,
  center,
  zoom = 12,
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
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<LeafletTileLayer | null>(null);
  const stationMarkersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const carMarkerRef = useRef<LeafletMarker | null>(null);
  const carElRef = useRef<HTMLElement | null>(null);
  const routeRef = useRef<LeafletPolyline | null>(null);
  const routeCasingRef = useRef<LeafletPolyline | null>(null);
  const LRef = useRef<typeof L | null>(null);

  const { resolved } = useTheme();
  const [basemap, setBasemap] = useState<Basemap>(initialBasemap ?? (resolved === "dark" ? "dark" : "streets"));
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Load Leaflet dynamically (client only) and initialise once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const Lmod = (mod as unknown as { default: typeof L }).default ?? (mod as unknown as typeof L);
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current || mapRef.current) return;
      LRef.current = Lmod;
      const map = Lmod.map(ref.current, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: false,
        zoom,
        center: [center?.lat ?? 6.4396, center?.lng ?? 3.4735],
      });
      mapRef.current = map;
      Lmod.control.zoom({ position: "bottomright" }).addTo(map);

      const t = TILES[basemap];
      tileRef.current = Lmod.tileLayer(t.url, {
        attribution: t.attribution,
        maxZoom: t.maxZoom,
        subdomains: t.subdomains,
        crossOrigin: true,
      }).addTo(map);
      // Swallow individual tile 4xx/5xx so a bad tile does not surface as an
      // unhandled error and unmount the map.
      tileRef.current.on("tileerror", (ev) => {
        const e = ev as unknown as { error?: { message?: string } };
        console.warn("[map tile]", e?.error?.message || "tile failed");
      });
      if (t.dark) map.getContainer().classList.add("plug-map-dark");

      if (onMapClick) map.on("click", (e) => onMapClick(e.latlng.lng, e.latlng.lat));
      if (!interactive) {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.touchZoom.disable();
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current;
      if (m) {
        m.remove();
        mapRef.current = null;
      }
      stationMarkersRef.current.clear();
      carMarkerRef.current = null;
      carElRef.current = null;
      routeRef.current = null;
      routeCasingRef.current = null;
      tileRef.current = null;
      LRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme sync: only if the user has not explicitly chosen satellite / terrain
  useEffect(() => {
    if (basemap === "satellite" || basemap === "terrain") return;
    setBasemap(resolved === "dark" ? "dark" : "streets");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  // Basemap swap
  useEffect(() => {
    const map = mapRef.current;
    const Lmod = LRef.current;
    if (!map || !Lmod) return;
    if (tileRef.current) tileRef.current.remove();
    const t = TILES[basemap];
    tileRef.current = Lmod.tileLayer(t.url, {
      attribution: t.attribution,
      maxZoom: t.maxZoom,
      subdomains: t.subdomains,
      crossOrigin: true,
    }).addTo(map);
    map.getContainer().classList.toggle("plug-map-dark", !!t.dark);
  }, [basemap, ready]);

  // Camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (center) map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center?.lng, center?.lat, zoom, ready]);

  // Station markers
  useEffect(() => {
    const map = mapRef.current;
    const Lmod = LRef.current;
    if (!map || !Lmod || !ready) return;
    const existing = stationMarkersRef.current;
    const nextIds = new Set(stations.map((s) => s.id));
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) { marker.remove(); existing.delete(id); }
    }
    for (const s of stations) {
      const prior = existing.get(s.id);
      if (prior) { prior.remove(); existing.delete(s.id); }
      const icon = Lmod.divIcon({ html: stationMarkerHTML(s), className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
      const marker = Lmod.marker([s.lat, s.lng], { icon }).addTo(map);
      if (onStationClick) marker.on("click", () => onStationClick(s.id));
      existing.set(s.id, marker);
    }
  }, [stations, onStationClick, ready]);

  // Car marker
  useEffect(() => {
    const map = mapRef.current;
    const Lmod = LRef.current;
    if (!map || !Lmod || !ready) return;
    if (car) {
      if (!carMarkerRef.current) {
        const icon = Lmod.divIcon({ html: carMarkerHTML(car.bearing ?? 0), className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
        carMarkerRef.current = Lmod.marker([car.lat, car.lng], { icon, interactive: false }).addTo(map);
        carElRef.current = (carMarkerRef.current.getElement() as HTMLElement | null)?.querySelector("div") as HTMLElement | null;
      } else {
        carMarkerRef.current.setLatLng([car.lat, car.lng]);
        // Update rotation in the inner div only, without recreating the icon.
        const el = carMarkerRef.current.getElement()?.querySelector("div") as HTMLElement | null;
        if (el) el.style.transform = `rotate(${car.bearing ?? 0}deg)`;
      }
      if (followCar) {
        map.panTo([car.lat, car.lng], { animate: true, duration: 0.3 });
      }
    } else if (carMarkerRef.current) {
      carMarkerRef.current.remove();
      carMarkerRef.current = null;
      carElRef.current = null;
    }
  }, [car?.lng, car?.lat, car?.bearing, followCar, ready]);

  // Route
  useEffect(() => {
    const map = mapRef.current;
    const Lmod = LRef.current;
    if (!map || !Lmod || !ready) return;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    if (routeCasingRef.current) { routeCasingRef.current.remove(); routeCasingRef.current = null; }
    if (!route) return;
    const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) as [number, number][];
    routeCasingRef.current = Lmod.polyline(latlngs, { color: "#ffffff", weight: 8, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(map);
    routeRef.current = Lmod.polyline(latlngs, { color: "#2F5BD3", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(map);
    if (route.bounds) {
      const [minLng, minLat, maxLng, maxLat] = route.bounds;
      try { map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [50, 50], animate: true }); } catch { /* noop */ }
    }
  }, [route, ready]);

  return (
    <div className={className ?? "relative h-full w-full"} style={{ position: "relative", minHeight: 200 }}>
      <div ref={ref} className="absolute inset-0" style={{ background: "#e5e7eb" }} />
      {showBasemapSwitcher && (
        <div className="absolute bottom-3 left-3 z-[400]">
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
