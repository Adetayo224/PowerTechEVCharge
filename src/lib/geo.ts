export type LngLat = { lng: number; lat: number };

export function haversineKm(a: LngLat, b: LngLat) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function bearingDeg(a: LngLat, b: LngLat) {
  const y = Math.sin((b.lng - a.lng) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
  const x =
    Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
    Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos((b.lng - a.lng) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function formatDurationMin(min: number) {
  if (min < 1) return "under a minute";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatDistanceKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export type OSRMRoute = {
  distanceKm: number;
  durationMin: number;
  geometry: GeoJSON.LineString;
  steps: OSRMStep[];
  bounds: [number, number, number, number];
};

export type OSRMStep = {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
    bearing_after?: number;
  };
  geometry: GeoJSON.LineString;
};

const OSRM = "https://router.project-osrm.org";

export async function fetchOSRMRoute(from: LngLat, to: LngLat): Promise<OSRMRoute> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    const r = data.routes?.[0];
    if (!r) throw new Error("No route");
    const leg = r.legs?.[0];
    const bounds = boundsFor(r.geometry.coordinates);
    return {
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
      geometry: r.geometry,
      steps: (leg?.steps ?? []).map((s: {
        distance: number;
        duration: number;
        name: string;
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
          bearing_after?: number;
        };
        geometry: GeoJSON.LineString;
      }) => ({
        distance: s.distance,
        duration: s.duration,
        name: s.name,
        maneuver: s.maneuver,
        geometry: s.geometry,
      })),
      bounds,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function straightLineRoute(from: LngLat, to: LngLat): OSRMRoute {
  const km = haversineKm(from, to);
  return {
    distanceKm: km,
    durationMin: (km / 40) * 60,
    geometry: { type: "LineString", coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
    steps: [
      {
        distance: km * 1000,
        duration: (km / 40) * 3600,
        name: "Destination",
        maneuver: { type: "depart", location: [from.lng, from.lat], bearing_after: Math.round(bearingDeg(from, to)) },
        geometry: { type: "LineString", coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
      },
      {
        distance: 0,
        duration: 0,
        name: "Destination",
        maneuver: { type: "arrive", location: [to.lng, to.lat] },
        geometry: { type: "LineString", coordinates: [[to.lng, to.lat]] },
      },
    ],
    bounds: boundsFor([[from.lng, from.lat], [to.lng, to.lat]]),
  };
}

function boundsFor(coords: number[][]): [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

// Interpolate along a LineString to a target distance (metres).
// Returns { lng, lat, bearing, doneMetres, finished }.
export function positionAlongRoute(geometry: GeoJSON.LineString, distanceMetres: number) {
  const coords = geometry.coordinates as [number, number][];
  let acc = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = { lng: coords[i][0], lat: coords[i][1] };
    const b = { lng: coords[i + 1][0], lat: coords[i + 1][1] };
    const seg = haversineKm(a, b) * 1000;
    if (acc + seg >= distanceMetres || i === coords.length - 2) {
      const remain = Math.max(0, distanceMetres - acc);
      const t = seg > 0 ? Math.min(1, remain / seg) : 1;
      const lng = a.lng + (b.lng - a.lng) * t;
      const lat = a.lat + (b.lat - a.lat) * t;
      const bearing = bearingDeg(a, b);
      const finished = distanceMetres >= totalLength(coords);
      return { lng, lat, bearing, finished };
    }
    acc += seg;
  }
  const [lng, lat] = coords[coords.length - 1];
  return { lng, lat, bearing: 0, finished: true };
}

export function totalLength(coords: number[][]) {
  let acc = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    acc += haversineKm({ lng: coords[i][0], lat: coords[i][1] }, { lng: coords[i + 1][0], lat: coords[i + 1][1] }) * 1000;
  }
  return acc;
}
