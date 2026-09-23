-- Row Level Security
alter table public.profiles enable row level security;
alter table public.stations enable row level security;
alter table public.chargers enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;

-- profiles: user reads/updates own row
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- stations: anyone signed in can read; owners manage their own
drop policy if exists "stations read" on public.stations;
create policy "stations read" on public.stations for select using (auth.role() = 'authenticated');
drop policy if exists "stations owner write" on public.stations;
create policy "stations owner write" on public.stations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- chargers: readable to signed in; writable by station owner
drop policy if exists "chargers read" on public.chargers;
create policy "chargers read" on public.chargers for select using (auth.role() = 'authenticated');
drop policy if exists "chargers owner write" on public.chargers;
create policy "chargers owner write" on public.chargers
  for all
  using (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()));

-- availability
drop policy if exists "availability read" on public.availability;
create policy "availability read" on public.availability for select using (auth.role() = 'authenticated');
drop policy if exists "availability owner write" on public.availability;
create policy "availability owner write" on public.availability
  for all using (exists (
    select 1 from public.chargers c join public.stations s on s.id = c.station_id
    where c.id = charger_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.chargers c join public.stations s on s.id = c.station_id
    where c.id = charger_id and s.owner_id = auth.uid()
  ));

-- bookings: driver reads/writes own; operator reads bookings on their stations
drop policy if exists "bookings driver read" on public.bookings;
create policy "bookings driver read" on public.bookings
  for select using (driver_id = auth.uid()
    or exists (select 1 from public.chargers c join public.stations s on s.id = c.station_id
               where c.id = charger_id and s.owner_id = auth.uid()));
drop policy if exists "bookings driver update" on public.bookings;
create policy "bookings driver update" on public.bookings
  for update using (driver_id = auth.uid()) with check (driver_id = auth.uid());
-- inserts are done through create_booking (security definer), no insert policy exposed
-- allow driver to see available slots on any charger through server API (already covered by chargers read)

-- realtime publication for chargers and bookings
do $$ begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.chargers;
alter publication supabase_realtime add table public.bookings;
