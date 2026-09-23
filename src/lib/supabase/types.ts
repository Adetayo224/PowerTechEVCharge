export type Role = "driver" | "operator";
export type ChargerStatus = "online" | "offline" | "unavailable";
export type BookingStatus = "confirmed" | "cancelled" | "completed";
export type Connector = "CCS2" | "Type 2" | "CHAdeMO" | "GB/T";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  created_at: string;
}

export interface Station {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  amenities: string[];
  photo_url: string | null;
  created_at: string;
}

export interface Charger {
  id: string;
  station_id: string;
  label: string;
  connector_type: Connector;
  power_kw: number;
  price_per_kwh: number;
  status: ChargerStatus;
  created_at: string;
}

export interface Availability {
  id: string;
  charger_id: string;
  weekday: number;
  open_time: string;
  close_time: string;
}

export interface Booking {
  id: string;
  reference: string;
  charger_id: string;
  driver_id: string;
  slot: string;
  status: BookingStatus;
  estimated_kwh: number;
  estimated_cost: number;
  created_at: string;
}
