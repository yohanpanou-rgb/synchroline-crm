-- Make current_rep_id the sole source of truth for doctor visibility/ownership.
-- Previously doctors_select_scope also granted access via any OPEN territory_assignments
-- row, which caused stale historical assignments (left open after a manual reassignment)
-- to leak a doctor's visibility to a rep who no longer owns them.

drop policy if exists "doctors_select_scope" on public.doctors;

create policy "doctors_select_scope" on public.doctors
  for select using (
    public.current_user_role() in ('manager','admin')
    or current_rep_id = auth.uid()
  );

drop policy if exists "doctors_update_rep_rating" on public.doctors;

create policy "doctors_update_rep_rating" on public.doctors
  for update
  using (public.current_user_role() = 'rep' and current_rep_id = auth.uid())
  with check (public.current_user_role() = 'rep' and current_rep_id = auth.uid());

-- Data hygiene: close any stale open territory_assignments rows that no longer match
-- the doctor's current_rep_id, and open a fresh row reflecting the actual current owner.
update territory_assignments ta
set valid_to = current_date
from doctors d
where ta.doctor_id = d.id
  and ta.valid_to is null
  and ta.rep_id is distinct from d.current_rep_id;

insert into territory_assignments (doctor_id, rep_id, valid_from, created_by)
select d.id, d.current_rep_id, current_date, d.current_rep_id
from doctors d
where d.current_rep_id is not null
  and d.status = 'active'
  and not exists (
    select 1 from territory_assignments ta
    where ta.doctor_id = d.id and ta.rep_id = d.current_rep_id and ta.valid_to is null
  );
