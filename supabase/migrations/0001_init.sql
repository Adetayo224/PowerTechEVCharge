-- Samfred Charge initial schema
create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null check (role in ('driver','operator')),
  phone text,
  created_at timestamptz not null default now()
);

-- stations
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  amenities text[] not null default '{}',
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists stations_city_idx on public.stations(city);
create index if not exists stations_owner_idx on public.stations(owner_id);

-- chargers
create table if not exists public.chargers (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  label text not null,
  connector_type text not null check (connector_type in ('CCS2','Type 2','CHAdeMO','GB/T')),
  power_kw numeric(6,2) not null check (power_kw > 0),
  price_per_kwh numeric(8,2) not null check (price_per_kwh >= 0),
  status text not null default 'online' check (status in ('online','offline','unavailable')),
  created_at timestamptz not null default now()
);
create index if not exists chargers_station_idx on public.chargers(station_id);
create index if not exists chargers_status_idx on public.chargers(status);

-- availability (weekly recurring hours per charger)
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  charger_id uuid not null references public.chargers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  check (open_time < close_time)
);
create index if not exists availability_charger_idx on public.availability(charger_id);

-- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  charger_id uuid not null references public.chargers(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  slot tstzrange not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  estimated_kwh numeric(8,2) not null default 0,
  estimated_cost numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  -- prevent overlapping confirmed bookings on the same charger
  constraint no_double_booking exclude using gist (
    charger_id with =,
    slot with &&
  ) where (status = 'confirmed')
);
create index if not exists bookings_driver_idx on public.bookings(driver_id);
create index if not exists bookings_charger_idx on public.bookings(charger_id);
create index if not exists bookings_slot_idx on public.bookings using gist (slot);

-- auto profile creation on signup, role from user metadata (default driver)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'driver'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- reference generator: 8 uppercase alphanumerics, no ambiguous chars
create or replace function public.generate_booking_reference()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  bytes bytea;
begin
  bytes := gen_random_bytes(8);
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end $$;

-- create_booking: validates slot, hours, status; inserts confirmed booking
create or replace function public.create_booking(
  p_charger_id uuid,
  p_start_time timestamptz
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_charger public.chargers%rowtype;
  v_slot tstzrange;
  v_end timestamptz;
  v_weekday int;
  v_time time;
  v_end_time time;
  v_exists boolean;
  v_ref text;
  v_row public.bookings%rowtype;
  v_kwh numeric;
  v_cost numeric;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into v_charger from public.chargers where id = p_charger_id;
  if not found then raise exception 'Charger not found'; end if;
  if v_charger.status <> 'online' then
    raise exception 'This charger is not online right now';
  end if;

  -- align to :00 or :30, 30 minute duration
  if extract(minute from p_start_time)::int not in (0, 30)
     or extract(second from p_start_time)::int <> 0 then
    raise exception 'Slot must start on the hour or half hour';
  end if;
  if p_start_time <= now() then
    raise exception 'Slot must be in the future';
  end if;
  v_end := p_start_time + interval '30 minutes';
  v_slot := tstzrange(p_start_time, v_end, '[)');

  -- must be within an availability window (Africa/Lagos)
  v_weekday := extract(dow from (p_start_time at time zone 'Africa/Lagos'))::int;
  v_time := (p_start_time at time zone 'Africa/Lagos')::time;
  v_end_time := (v_end at time zone 'Africa/Lagos')::time;
  select exists(
    select 1 from public.availability a
    where a.charger_id = p_charger_id
      and a.weekday = v_weekday
      and a.open_time <= v_time
      and a.close_time >= v_end_time
  ) into v_exists;
  if not v_exists then
    raise exception 'Slot is outside operating hours';
  end if;

  v_kwh := round((v_charger.power_kw * 0.5)::numeric, 2);
  v_cost := round((v_kwh * v_charger.price_per_kwh)::numeric, 2);

  -- generate a unique reference (retry a few times on collision)
  for i in 1..5 loop
    v_ref := public.generate_booking_reference();
    begin
      insert into public.bookings(reference, charger_id, driver_id, slot, status, estimated_kwh, estimated_cost)
      values (v_ref, p_charger_id, v_user, v_slot, 'confirmed', v_kwh, v_cost)
      returning * into v_row;
      return v_row;
    exception
      when unique_violation then
        if sqlerrm like '%bookings_reference_key%' then
          continue;
        end if;
        raise exception 'This slot was just taken. Please pick another.' using errcode = 'P0002';
      when exclusion_violation then
        raise exception 'This slot was just taken. Please pick another.' using errcode = 'P0002';
    end;
  end loop;
  raise exception 'Could not allocate a booking reference. Try again.';
end $$;

grant execute on function public.create_booking(uuid, timestamptz) to authenticated;
grant execute on function public.generate_booking_reference() to authenticated;
