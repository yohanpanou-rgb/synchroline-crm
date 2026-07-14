create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  full_name_raw text,
  last_name text not null,
  first_name text not null,
  region text,
  county text,
  brick_code text references public.bricks(code),
  dynamic_category text check (dynamic_category in ('Α','Β','Γ')),
  budget_2025 numeric(12,2),
  budget_2026 numeric(12,2),
  disbursed_2025 numeric(12,2),
  disbursed_2026 numeric(12,2),
  incentive_2025 numeric(12,2),
  incentive_2026 numeric(12,2),
  priority_color text check (priority_color in ('green','orange','red')),
  pharmacy_1 text,
  pharmacy_2 text,
  weekly_rx_aknicare numeric(8,2),
  weekly_rx_closebax numeric(8,2),
  weekly_rx_terproline numeric(8,2),
  weekly_rx_rosacure numeric(8,2),
  current_rep_id uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active','pending_approval','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_doctors_current_rep on public.doctors(current_rep_id);
create index idx_doctors_brick on public.doctors(brick_code);
create index idx_doctors_status on public.doctors(status);

create trigger trg_doctors_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

-- hospital_id παραλείπεται σκόπιμα (Φάση 2, μαζί με τον πίνακα hospitals).
