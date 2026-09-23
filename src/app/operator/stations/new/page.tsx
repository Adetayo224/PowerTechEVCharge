"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button, Card, Input, Label } from "@/components/ui";

const PinPicker = dynamic(() => import("@/components/map/pin-picker"), { ssr: false, loading: () => <div className="h-64 skeleton rounded-2xl" /> });

export default function NewStation() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lagos");
  const [amenities, setAmenities] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number }>({ lat: 6.5244, lng: 3.3792 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const res = await fetch("/api/stations", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name, address, city, lat: pin.lat, lng: pin.lng,
        amenities: amenities.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error || "Could not create");
    router.push(`/operator/stations/${data.station.id}`);
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-4 pt-6 safe-top space-y-4">
      <h1 className="text-2xl font-bold">New station</h1>
      <Card className="space-y-3">
        <div className="space-y-1.5"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Address</Label><Input required value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>City</Label><Input required value={city} onChange={(e) => setCity(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Amenities (comma separated)</Label><Input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Cafe, WiFi" /></div>
      </Card>
      <Card>
        <div className="text-xs text-[var(--muted-foreground)] mb-2">Drop a pin</div>
        <div className="h-64 rounded-2xl overflow-hidden"><PinPicker value={pin} onChange={setPin} /></div>
        <div className="mt-2 text-xs text-[var(--muted-foreground)]">Lat {pin.lat.toFixed(5)} · Lng {pin.lng.toFixed(5)}</div>
      </Card>
      {error && <div className="text-sm text-red-500">{error}</div>}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Saving" : "Create station"}</Button>
    </form>
  );
}
