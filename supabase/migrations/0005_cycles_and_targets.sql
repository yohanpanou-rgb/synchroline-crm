create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint valid_cycle_range check (end_date > start_date)
);

-- Μόνο ένας ενεργός κύκλος τη φορά (βάση για το pacing indicator)
create unique index uniq_active_cycle on public.cycles(is_active) where is_active = true;

create table public.cycle_targets (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles(id),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  target_visits integer not null default 0,
  target_coverage_pct numeric(5,2) not null default 0,
  set_by uuid references public.profiles(id),
  set_at timestamptz not null default now(),
  unique (rep_id, cycle_id)
);
