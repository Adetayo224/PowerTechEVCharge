-- PlugSpot live queue and charger state
-- Adds per-charger live occupancy so drivers can see wait times in real time.

create table if not exists public.charger_state (
  charger_id uuid primary key references public.chargers(id) on delete cascade,
  in_use boolean not null default false,
  session_started_at timestamptz,
  session_ends_at timestamptz,
  waiting int not null default 0 check (waiting >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists charger_state_updated_idx on public.charger_state(updated_at);

alter table public.charger_state enable row level security;

drop policy if exists "charger_state read" on public.charger_state;
create policy "charger_state read" on public.charger_state
  for select using (auth.role() = 'authenticated');

drop policy if exists "charger_state owner write" on public.charger_state;
create policy "charger_state owner write" on public.charger_state
  for all
  using (exists (
    select 1 from public.chargers c join public.stations s on s.id = c.station_id
    where c.id = charger_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.chargers c join public.stations s on s.id = c.station_id
    where c.id = charger_id and s.owner_id = auth.uid()
  ));

-- Seed a state row for every existing charger (idempotent).
insert into public.charger_state (charger_id, in_use, waiting)
select id, false, 0 from public.chargers
on conflict (charger_id) do nothing;

-- Ensure new chargers get a state row.
create or replace function public.ensure_charger_state()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.charger_state (charger_id) values (new.id)
  on conflict (charger_id) do nothing;
  return new;
end $$;

drop trigger if exists on_charger_created on public.chargers;
create trigger on_charger_created after insert on public.chargers
  for each row execute function public.ensure_charger_state();

-- Realtime publication
alter publication supabase_realtime add table public.charger_state;

-- A single RPC to advance the simulator by the given interval seconds.
-- Called from the client on a timer to keep state fresh without a background worker.
create or replace function public.tick_charger_state(p_interval_seconds int default 5)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  new_waiting int;
  new_in_use boolean;
  new_start timestamptz;
  new_end timestamptz;
  duration_min int;
  rnd float;
begin
  for r in
    select cs.charger_id, cs.in_use, cs.session_ends_at, cs.waiting, c.power_kw, c.status
    from public.charger_state cs
    join public.chargers c on c.id = cs.charger_id
  loop
    new_waiting := r.waiting;
    new_in_use := r.in_use;
    new_start := null;
    new_end := null;

    if r.status <> 'online' then
      -- Offline chargers cannot host sessions.
      update public.charger_state
        set in_use = false, session_started_at = null, session_ends_at = null,
            waiting = 0, updated_at = now()
        where charger_id = r.charger_id;
      continue;
    end if;

    if r.in_use and r.session_ends_at is not null and r.session_ends_at <= now() then
      -- Session ended. If someone is waiting, promote them.
      if r.waiting > 0 then
        duration_min := greatest(15, least(60, (60 / greatest(r.power_kw / 30.0, 1))::int));
        new_in_use := true;
        new_waiting := r.waiting - 1;
        new_start := now();
        new_end := now() + make_interval(mins => duration_min);
      else
        new_in_use := false;
      end if;
    elsif not r.in_use then
      -- Idle chargers occasionally start a new session or have a car queue up.
      rnd := random();
      if rnd < 0.18 then
        duration_min := greatest(15, least(60, (60 / greatest(r.power_kw / 30.0, 1))::int));
        new_in_use := true;
        new_start := now();
        new_end := now() + make_interval(mins => duration_min);
      end if;
    else
      -- Session in progress: someone might queue up.
      if random() < 0.10 and r.waiting < 4 then
        new_waiting := r.waiting + 1;
      end if;
    end if;

    update public.charger_state
      set in_use = new_in_use,
          session_started_at = case when new_start is not null then new_start else session_started_at end,
          session_ends_at = case when new_end is not null then new_end else (case when new_in_use then session_ends_at else null end) end,
          waiting = new_waiting,
          updated_at = now()
      where charger_id = r.charger_id;
  end loop;
end $$;

grant execute on function public.tick_charger_state(int) to authenticated;
