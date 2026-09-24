-- Operator notifications feed and a trigger that appends a notification for the
-- station owner every time a confirmed booking is inserted.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Inserts happen through the trigger below (definer). No insert policy needed for clients.

-- Realtime
alter publication supabase_realtime add table public.notifications;

-- Trigger: on a new confirmed booking, insert a notification for the station owner
-- and expose the driver email + operator email so the API route can send an email.
create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_station public.stations%rowtype;
  v_charger public.chargers%rowtype;
  v_driver_email text;
  v_operator_email text;
  v_start timestamptz;
begin
  if new.status <> 'confirmed' then return new; end if;

  select * into v_charger from public.chargers where id = new.charger_id;
  if not found then return new; end if;
  select * into v_station from public.stations where id = v_charger.station_id;
  if not found then return new; end if;

  select email into v_driver_email from auth.users where id = new.driver_id;
  select email into v_operator_email from auth.users where id = v_station.owner_id;

  v_start := lower(new.slot);

  insert into public.notifications (user_id, kind, title, body, data)
  values (
    v_station.owner_id,
    'booking_created',
    'New booking at ' || v_station.name,
    'Charger ' || v_charger.label || ' · starts ' || to_char(v_start at time zone 'Africa/Lagos', 'DD Mon HH24:MI'),
    jsonb_build_object(
      'booking_id', new.id,
      'reference', new.reference,
      'station_id', v_station.id,
      'station_name', v_station.name,
      'station_address', v_station.address,
      'charger_label', v_charger.label,
      'power_kw', v_charger.power_kw,
      'start_iso', v_start,
      'estimated_cost', new.estimated_cost,
      'estimated_kwh', new.estimated_kwh,
      'driver_email', v_driver_email,
      'operator_email', v_operator_email
    )
  );
  return new;
end $$;

drop trigger if exists on_booking_created on public.bookings;
create trigger on_booking_created
  after insert on public.bookings
  for each row execute function public.notify_booking_created();

-- Trigger: when a booking is rescheduled (slot changed while still confirmed),
-- notify the operator.
create or replace function public.notify_booking_rescheduled()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_station public.stations%rowtype;
  v_charger public.chargers%rowtype;
  v_start timestamptz;
begin
  if new.slot = old.slot then return new; end if;
  if new.status <> 'confirmed' then return new; end if;

  select * into v_charger from public.chargers where id = new.charger_id;
  if not found then return new; end if;
  select * into v_station from public.stations where id = v_charger.station_id;
  if not found then return new; end if;

  v_start := lower(new.slot);

  insert into public.notifications (user_id, kind, title, body, data)
  values (
    v_station.owner_id,
    'booking_rescheduled',
    'Booking rescheduled at ' || v_station.name,
    'Charger ' || v_charger.label || ' · new start ' || to_char(v_start at time zone 'Africa/Lagos', 'DD Mon HH24:MI'),
    jsonb_build_object(
      'booking_id', new.id,
      'reference', new.reference,
      'station_id', v_station.id,
      'station_name', v_station.name,
      'charger_label', v_charger.label,
      'start_iso', v_start
    )
  );
  return new;
end $$;

drop trigger if exists on_booking_rescheduled on public.bookings;
create trigger on_booking_rescheduled
  after update of slot on public.bookings
  for each row execute function public.notify_booking_rescheduled();

-- reschedule_booking(booking_id, new_start): moves a driver's confirmed booking to
-- a new 30 minute slot. Reuses the same guards as create_booking (aligned, future,
-- within hours, no overlap) and lets the exclusion constraint catch races.
create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_new_start timestamptz
) returns public.bookings
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_booking public.bookings%rowtype;
  v_charger public.chargers%rowtype;
  v_slot tstzrange;
  v_end timestamptz;
  v_weekday int;
  v_time time;
  v_end_time time;
  v_exists boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '28000'; end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.driver_id <> auth.uid() then raise exception 'Not your booking'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'This booking cannot be rescheduled'; end if;

  select * into v_charger from public.chargers where id = v_booking.charger_id;
  if v_charger.status <> 'online' then raise exception 'This charger is not online right now'; end if;

  if extract(minute from p_new_start)::int not in (0, 30)
     or extract(second from p_new_start)::int <> 0 then
    raise exception 'Slot must start on the hour or half hour';
  end if;
  if p_new_start <= now() then raise exception 'Slot must be in the future'; end if;

  v_end := p_new_start + interval '30 minutes';
  v_slot := tstzrange(p_new_start, v_end, '[)');

  v_weekday := extract(dow from (p_new_start at time zone 'Africa/Lagos'))::int;
  v_time := (p_new_start at time zone 'Africa/Lagos')::time;
  v_end_time := (v_end at time zone 'Africa/Lagos')::time;
  select exists(
    select 1 from public.availability a
    where a.charger_id = v_charger.id
      and a.weekday = v_weekday
      and a.open_time <= v_time
      and a.close_time >= v_end_time
  ) into v_exists;
  if not v_exists then raise exception 'Slot is outside operating hours'; end if;

  begin
    update public.bookings set slot = v_slot where id = p_booking_id returning * into v_booking;
    return v_booking;
  exception
    when exclusion_violation then
      raise exception 'This slot was just taken. Please pick another.' using errcode = 'P0002';
  end;
end $$;

grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;
