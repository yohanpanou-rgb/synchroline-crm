-- Το "visits_restrict_institution" ήταν "for all" (SELECT/INSERT/UPDATE/DELETE μαζί),
-- αλλά το ενδιάμεσο branch του (γιατρός χωρίς νοσοκομείο) δεν ελέγχει auth.uid() --
-- έκανε ορατή σε ΚΑΘΕ rep κάθε επίσκεψη οποιουδήποτε άλλου rep σε μη-νοσοκομειακό
-- γιατρό, παρακάμπτοντας το σωστό rep-scoping του visits_select_scope (Postgres RLS
-- κάνει OR ανάμεσα σε permissive policies). Το SELECT πρέπει να μείνει αποκλειστικά
-- στο visits_select_scope· η policy αυτή χρειάζεται μόνο για INSERT/UPDATE.
drop policy if exists "visits_restrict_institution" on public.visits;

create policy "visits_restrict_institution_insert" on public.visits
  for insert
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

create policy "visits_restrict_institution_update" on public.visits
  for update
  using (
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
