-- Admin role + admin-wide read access + operator station claim flow.

-- 1) Allow 'admin' as a role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('driver','operator','admin'));

-- 2) Helper: is_admin(). Used by RLS to grant read-all on core tables.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- 3) Admin read-all policies. These are additive; existing per-user policies
--    keep working for drivers and operators.
drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admin read all stations" on public.stations;
create policy "admin read all stations" on public.stations
  for select using (public.is_admin());

drop policy if exists "admin write all stations" on public.stations;
create policy "admin write all stations" on public.stations
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read all chargers" on public.chargers;
create policy "admin read all chargers" on public.chargers
  for select using (public.is_admin());

drop policy if exists "admin read all bookings" on public.bookings;
create policy "admin read all bookings" on public.bookings
  for select using (public.is_admin());

drop policy if exists "admin read all charger_state" on public.charger_state;
create policy "admin read all charger_state" on public.charger_state
  for select using (public.is_admin());

-- 4) List stations that an operator can claim (owned by an admin).
create or replace function public.list_claimable_stations()
returns setof public.stations
language sql stable security definer set search_path = public as $$
  select s.* from public.stations s
  join public.profiles p on p.id = s.owner_id
  where p.role = 'admin'
  order by s.city, s.name;
$$;
grant execute on function public.list_claimable_stations() to authenticated;

-- 5) Operator claims a station. Only stations currently owned by an admin can
--    be claimed. Ownership then transfers to the operator.
create or replace function public.claim_station(p_station_id uuid)
returns public.stations
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_station public.stations%rowtype;
  v_caller_role text;
  v_owner_role text;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role <> 'operator' then raise exception 'Only operators can claim stations'; end if;
  select * into v_station from public.stations where id = p_station_id;
  if not found then raise exception 'Station not found'; end if;
  select role into v_owner_role from public.profiles where id = v_station.owner_id;
  if v_owner_role <> 'admin' then raise exception 'This station is already claimed by another operator'; end if;
  update public.stations set owner_id = auth.uid() where id = p_station_id returning * into v_station;
  return v_station;
end $$;
grant execute on function public.claim_station(uuid) to authenticated;

-- 6) Notification trigger: notify station owner AND every admin.
create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_station public.stations%rowtype;
  v_charger public.chargers%rowtype;
  v_driver_email text;
  v_operator_email text;
  v_start timestamptz;
  v_admin_id uuid;
  v_title text;
  v_body text;
  v_data jsonb;
begin
  if new.status <> 'confirmed' then return new; end if;

  select * into v_charger from public.chargers where id = new.charger_id;
  if not found then return new; end if;
  select * into v_station from public.stations where id = v_charger.station_id;
  if not found then return new; end if;
  select email into v_driver_email from auth.users where id = new.driver_id;
  select email into v_operator_email from auth.users where id = v_station.owner_id;

  v_start := lower(new.slot);
  v_title := 'New booking at ' || v_station.name;
  v_body := 'Charger ' || v_charger.label || ' · starts ' || to_char(v_start at time zone 'Africa/Lagos', 'DD Mon HH24:MI');
  v_data := jsonb_build_object(
    'booking_id', new.id, 'reference', new.reference,
    'station_id', v_station.id, 'station_name', v_station.name,
    'station_address', v_station.address, 'charger_label', v_charger.label,
    'power_kw', v_charger.power_kw, 'start_iso', v_start,
    'estimated_cost', new.estimated_cost, 'estimated_kwh', new.estimated_kwh,
    'driver_email', v_driver_email, 'operator_email', v_operator_email
  );

  -- Station owner
  insert into public.notifications (user_id, kind, title, body, data)
  values (v_station.owner_id, 'booking_created', v_title, v_body, v_data);

  -- Every admin (except the owner if the owner is an admin, to avoid dupes)
  for v_admin_id in
    select id from public.profiles where role = 'admin' and id <> v_station.owner_id
  loop
    insert into public.notifications (user_id, kind, title, body, data)
    values (v_admin_id, 'booking_created', v_title, v_body, v_data);
  end loop;

  return new;
end $$;
