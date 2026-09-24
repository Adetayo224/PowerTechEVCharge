"use client";
import { use, useEffect, useState } from "react";
import { NavigationView, NavigationSkeleton } from "@/components/navigation-view";
import { createClient } from "@/lib/supabase/browser";

type Booking = {
  id: string;
  chargers: { stations: { id: string; name: string; address: string; lat: number; lng: number } };
};

export default function NavigateBookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("id, chargers(stations(id, name, address, lat, lng))")
        .eq("id", bookingId)
        .maybeSingle();
      if (!data) setNotFound(true);
      else setBooking(data as unknown as Booking);
    })();
  }, [bookingId]);

  if (notFound) {
    return <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">Booking not found.</div>;
  }
  if (!booking) return <NavigationSkeleton />;

  const s = booking.chargers.stations;
  return (
    <NavigationView
      destination={{ id: s.id, name: s.name, address: s.address, lng: s.lng, lat: s.lat }}
      bookingId={booking.id}
      backHref="/driver/home"
    />
  );
}
