create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'rep' check (role in ('rep','manager','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Σχεδιαστική σημείωση: το Microsoft OAuth προστίθεται αργότερα ως δεύτερος
-- identity provider στο ΙΔΙΟ auth.users row (το Supabase Auth το χειρίζεται
-- μέσω auth.identities). Το profiles.id παραμένει 1:1 με auth.users.id ό,τι
-- κι αν αλλάξει στο login flow — άρα ΔΕΝ χρειάζεται στήλη "provider" εδώ.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'rep')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create table public.bricks (
  code text primary key,
  name text,
  region text,
  county text,
  created_at timestamptz not null default now()
);
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
alter table public.profiles enable row level security;
alter table public.bricks enable row level security;
alter table public.doctors enable row level security;
alter table public.territory_assignments enable row level security;
alter table public.cycles enable row level security;
alter table public.cycle_targets enable row level security;
alter table public.visits enable row level security;
alter table public.visit_products enable row level security;

-- profiles
create policy "profiles_select_own_or_manager" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() in ('manager','admin'));

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_write_admin" on public.profiles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- bricks (reference data)
create policy "bricks_select_all" on public.bricks
  for select using (auth.role() = 'authenticated');

create policy "bricks_write_admin" on public.bricks
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- doctors
create policy "doctors_select_scope" on public.doctors
  for select using (
    public.current_user_role() in ('manager','admin')
    or current_rep_id = auth.uid()
    or exists (
      select 1 from public.territory_assignments ta
      where ta.doctor_id = doctors.id
        and ta.rep_id = auth.uid()
        and ta.valid_to is null
    )
  );

create policy "doctors_write_manager" on public.doctors
  for all using (public.current_user_role() in ('manager','admin'))
  with check (public.current_user_role() in ('manager','admin'));

-- Rep μπορεί μόνο να "προτείνει" νέο γιατρό: INSERT με status='pending_approval'
-- και current_rep_id τον εαυτό του (ή null). UPDATE/DELETE — και η έγκριση σε
-- 'active' — παραμένουν αποκλειστικά σε manager/admin (βλ. πολιτική παραπάνω).
create policy "doctors_insert_rep_pending" on public.doctors
  for insert
  with check (
    public.current_user_role() = 'rep'
    and status = 'pending_approval'
    and (current_rep_id is null or current_rep_id = auth.uid())
  );

-- territory_assignments
create policy "territory_select_scope" on public.territory_assignments
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "territory_write_manager" on public.territory_assignments
  for all using (public.current_user_role() in ('manager','admin'))
  with check (public.current_user_role() in ('manager','admin'));

-- cycles (κοινόχρηστη αναφορά)
create policy "cycles_select_all" on public.cycles
  for select using (auth.role() = 'authenticated');

create policy "cycles_write_admin" on public.cycles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- cycle_targets
create policy "cycle_targets_select_scope" on public.cycle_targets
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "cycle_targets_write_admin" on public.cycle_targets
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- visits
create policy "visits_select_scope" on public.visits
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "visits_write_own_or_manager" on public.visits
  for all using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid())
  with check (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

-- visit_products (κληρονομεί scope από τη γονική επίσκεψη)
create policy "visit_products_select_scope" on public.visit_products
  for select using (
    exists (select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid()))
  );

create policy "visit_products_write_scope" on public.visit_products
  for all using (
    exists (select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid()))
  )
  with check (
    exists (select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid()))
  );


-- Πρόσθετα πεδία από το πραγματικό αρχείο πελατολογίου (ΝΕΟ_ΑΡΧΕΙΟ_ΓΙΑΤΡΩΝ),
-- που δεν προβλέπονταν στο αρχικό PRD schema αλλά υπάρχουν στα δεδομένα.
alter table public.doctors
  add column specialty text,
  add column phone_1 text,
  add column phone_2 text,
  add column address text,
  add column notes text,
  add column hq_type text check (hq_type in ('ΕΔΡΑ', 'ΕΠΑΡΧΙΑ'));


-- Ώρα ραντεβού, για την προβολή ημερολογίου (Δευτέρα-Παρασκευή, 09:00-21:00, slots 30').
alter table public.visits
  add column scheduled_time time;
