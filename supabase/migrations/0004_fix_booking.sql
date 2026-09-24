-- Fix booking creation: gen_random_bytes lives in the extensions schema on Supabase.
-- The previous SECURITY DEFINER function ran with search_path = public and could not
-- resolve gen_random_bytes(int). We rewrite it to a schema-qualified call and add a
-- vehicle profile column set at the same time so drivers can save their car details.

-- 1) Reference generator with qualified call
create or replace function public.generate_booking_reference()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  bytes bytea;
begin
  bytes := extensions.gen_random_bytes(8);
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end $$;

-- 2) Ensure create_booking allows the extensions schema in its search path.
alter function public.create_booking(uuid, timestamptz)
  set search_path = public, extensions;
alter function public.generate_booking_reference()
  set search_path = public, extensions;

-- 3) Vehicle details on the driver profile
alter table public.profiles
  add column if not exists car_model text,
  add column if not exists battery_kwh numeric(6,2),
  add column if not exists efficiency_km_per_kwh numeric(5,2),
  add column if not exists battery_percent int check (battery_percent between 0 and 100),
  add column if not exists target_percent int check (target_percent between 0 and 100),
  add column if not exists avatar_url text;

-- 4) handle_new_user pulls car fields from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id, full_name, role, phone,
    car_model, battery_kwh, efficiency_km_per_kwh, battery_percent, target_percent
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'driver'),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'car_model', ''),
    nullif(new.raw_user_meta_data->>'battery_kwh', '')::numeric,
    nullif(new.raw_user_meta_data->>'efficiency_km_per_kwh', '')::numeric,
    nullif(new.raw_user_meta_data->>'battery_percent', '')::int,
    coalesce(nullif(new.raw_user_meta_data->>'target_percent', '')::int, 80)
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- 5) Storage bucket for user avatars (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read of avatars, owner-only writes
drop policy if exists "Public avatar read" on storage.objects;
create policy "Public avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar"
  on storage.objects for all
  using (bucket_id = 'avatars' and (auth.uid()::text = split_part(name, '/', 1)))
  with check (bucket_id = 'avatars' and (auth.uid()::text = split_part(name, '/', 1)));
