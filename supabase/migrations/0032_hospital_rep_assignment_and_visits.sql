-- Hospitals can be assigned to specific reps (many-to-many), doctors inside a hospital
-- become visible only to reps assigned to that hospital, and visits can be logged
-- against a hospital with multiple doctors seen in one visit.

create table if not exists public.institution_reps (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  rep_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (institution_id, rep_id)
);

alter table public.institution_reps enable row level security;

create policy "institution_reps_select_all" on public.institution_reps
  for select using (auth.role() = 'authenticated');

create policy "institution_reps_write_manager" on public.institution_reps
  for all
  using (public.current_user_role() in ('manager','admin'))
  with check (public.current_user_role() in ('manager','admin'));

-- Doctor visibility for institution doctors now follows institution_reps once an
-- institution has explicit rep assignments. Until a manager assigns reps to an
-- institution, its doctors keep today's behaviour (shared institutions with no
-- assignments stay visible to everyone; non-shared ones are still scoped by the
-- doctor's own current_rep_id via doctors_select_scope).
drop policy if exists "doctors_select_institution" on public.doctors;

create policy "doctors_select_institution" on public.doctors
  for select using (
    institution is not null
    and auth.role() = 'authenticated'
    and (
      exists (
        select 1
        from public.institutions i
        join public.institution_reps ir on ir.institution_id = i.id
        where i.name = doctors.institution
          and ir.rep_id = auth.uid()
      )
      or (
        not exists (
          select 1
          from public.institutions i
          join public.institution_reps ir on ir.institution_id = i.id
          where i.name = doctors.institution
        )
        and exists (
          select 1 from public.institutions i
          where i.name = doctors.institution and i.is_shared
        )
      )
    )
  );

-- Hospital-visit schema: a visit can now target a hospital (with multiple doctors
-- seen) instead of a single doctor. Must exist before the policy below references it.
alter table public.visits add column if not exists hospital_id uuid references public.institutions(id);
alter table public.visits alter column doctor_id drop not null;

alter table public.visits add constraint visits_doctor_or_hospital_check
  check (doctor_id is not null or hospital_id is not null);

-- Visit-side gate follows the same rule: once an institution has explicit rep
-- assignments, only assigned reps may create/see visits tied to its doctors.
-- Institutions with no explicit assignment keep the legacy can_visit_syggros gate.
drop policy if exists "visits_restrict_institution" on public.visits;

create policy "visits_restrict_institution" on public.visits
  for all using (
    public.current_user_role() in ('manager','admin')
    or (
      hospital_id is null
      and doctor_id is not null
      and not exists (
        select 1 from public.doctors d where d.id = visits.doctor_id and d.institution is not null
      )
    )
    or (
      hospital_id is not null
      and exists (
        select 1 from public.institution_reps ir
        where ir.institution_id = visits.hospital_id and ir.rep_id = auth.uid()
      )
    )
    or (
      hospital_id is null and doctor_id is not null
      and exists (
        select 1 from public.doctors d
        join public.institutions i on i.name = d.institution
        where d.id = visits.doctor_id
          and not exists (select 1 from public.institution_reps ir2 where ir2.institution_id = i.id)
          and exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.can_visit_syggros
          )
      )
    )
  )
  with check (
    public.current_user_role() in ('manager','admin')
    or (
      hospital_id is null
      and doctor_id is not null
      and not exists (
        select 1 from public.doctors d where d.id = visits.doctor_id and d.institution is not null
      )
    )
    or (
      hospital_id is not null
      and exists (
        select 1 from public.institution_reps ir
        where ir.institution_id = visits.hospital_id and ir.rep_id = auth.uid()
      )
    )
    or (
      hospital_id is null and doctor_id is not null
      and exists (
        select 1 from public.doctors d
        join public.institutions i on i.name = d.institution
        where d.id = visits.doctor_id
          and not exists (select 1 from public.institution_reps ir2 where ir2.institution_id = i.id)
          and exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.can_visit_syggros
          )
      )
    )
  );

create table if not exists public.visit_hospital_doctors (
  visit_id uuid not null references public.visits(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  primary key (visit_id, doctor_id)
);

alter table public.visit_hospital_doctors enable row level security;

create policy "visit_hospital_doctors_select" on public.visit_hospital_doctors
  for select using (
    exists (
      select 1 from public.visits v
      where v.id = visit_hospital_doctors.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid())
    )
  );

create policy "visit_hospital_doctors_write" on public.visit_hospital_doctors
  for all
  using (
    exists (
      select 1 from public.visits v
      where v.id = visit_hospital_doctors.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.visits v
      where v.id = visit_hospital_doctors.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid())
    )
  );
