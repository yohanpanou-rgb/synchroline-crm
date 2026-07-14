create table public.visits (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id),
  rep_id uuid not null references public.profiles(id),
  cycle_id uuid not null references public.cycles(id),
  visit_type text not null default 'normal' check (visit_type in ('normal','joint')),
  status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  scheduled_date date,
  completed_date date,
  notes text,
  location_context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_visits_doctor on public.visits(doctor_id);
create index idx_visits_rep_cycle on public.visits(rep_id, cycle_id);
create index idx_visits_status on public.visits(status);

create trigger trg_visits_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

create table public.visit_products (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  product_name text not null check (product_name in ('aknicare','closebax','terproline','rosacure')),
  samples_given integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (visit_id, product_name)
);
