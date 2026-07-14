create table public.territory_assignments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  rep_id uuid not null references public.profiles(id),
  valid_from date not null default current_date,
  valid_to date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint valid_range check (valid_to is null or valid_to >= valid_from)
);

create index idx_territory_doctor on public.territory_assignments(doctor_id);
create index idx_territory_rep on public.territory_assignments(rep_id);

-- Μόνο μία ενεργή ανάθεση (valid_to is null) ανά γιατρό τη φορά
create unique index uniq_active_assignment_per_doctor
  on public.territory_assignments(doctor_id)
  where valid_to is null;
