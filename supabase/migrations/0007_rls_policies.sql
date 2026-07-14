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
