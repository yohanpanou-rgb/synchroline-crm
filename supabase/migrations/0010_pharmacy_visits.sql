-- Εβδομαδιαίες επισκέψεις φαρμακείων (PRD ενότητα 6). Στόχος 8/εβδομάδα,
-- μπάρα προόδου στο dashboard rep. Χωρίς ξεχωριστό πίνακα φαρμακείων προς
-- το παρόν — pharmacy_name ελεύθερο κείμενο, χτίζεται σταδιακά (ανοιχτό
-- σημείο στο PRD ενότητα 12).
create table public.pharmacy_visits (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles(id),
  cycle_id uuid not null references public.cycles(id),
  visit_date date not null default current_date,
  pharmacy_name text not null,
  nearby_doctor_id uuid references public.doctors(id),
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pharmacy_visits_rep_date on public.pharmacy_visits(rep_id, visit_date);
create index idx_pharmacy_visits_cycle on public.pharmacy_visits(cycle_id);

create trigger trg_pharmacy_visits_updated_at
  before update on public.pharmacy_visits
  for each row execute function public.set_updated_at();

alter table public.pharmacy_visits enable row level security;

create policy "pharmacy_visits_select_scope" on public.pharmacy_visits
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "pharmacy_visits_write_own_or_manager" on public.pharmacy_visits
  for all using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid())
  with check (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());
