-- Γιατροί ιδρύματος (π.χ. Νοσοκομείο Συγγρός): δεν ανήκουν στο προσωπικό
-- πελατολόγιο κανενός rep, αλλά είναι κοινόχρηστοι. text (όχι enum) —
-- ίδια λογική με τα υπόλοιπα evolvable πεδία κατηγορίας σε αυτό το schema,
-- ώστε να μπορούν να προστεθούν κι άλλα ιδρύματα στο μέλλον χωρίς migration.
alter table public.doctors
  add column institution text;

-- Ποιοι reps επιτρέπεται να καταχωρήσουν επίσκεψη σε γιατρό ιδρύματος.
-- Boolean flag (όχι hardcoded λίστα ids μέσα στις policies) ώστε ο admin να
-- μπορεί να αλλάξει ποιος έχει πρόσβαση χωρίς νέο migration.
alter table public.profiles
  add column can_visit_syggros boolean not null default false;

-- doctors_select_scope: γιατροί ιδρύματος ορατοί σε όλους τους
-- authenticated χρήστες (permissive OR πάνω στην υπάρχουσα policy).
create policy "doctors_select_institution" on public.doctors
  for select using (institution is not null and auth.role() = 'authenticated');

-- Restrictive policy πάνω στο visits insert/update: αν ο γιατρός της
-- επίσκεψης έχει institution, μόνο profiles με can_visit_syggros=true (ή
-- manager/admin) περνάνε. Restrictive γιατί η υπάρχουσα
-- "visits_write_own_or_manager" (permissive, βλ. migration 0007) επιτρέπει
-- ήδη σε οποιονδήποτε rep να γράψει visits.rep_id = εαυτού του για
-- ΟΠΟΙΟΔΗΠΟΤΕ doctor_id — δεν υπάρχει άλλος τρόπος να περιοριστεί αυτό
-- ειδικά για τους γιατρούς ιδρύματος παρά με ξεχωριστή restrictive policy
-- (οι restrictive policies κάνουν AND πάνω από όλες τις permissive).
create policy "visits_restrict_institution" on public.visits
  as restrictive
  for all
  using (
    not exists (
      select 1 from public.doctors d
      where d.id = visits.doctor_id and d.institution is not null
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.can_visit_syggros or public.current_user_role() in ('manager', 'admin'))
    )
  )
  with check (
    not exists (
      select 1 from public.doctors d
      where d.id = visits.doctor_id and d.institution is not null
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.can_visit_syggros or public.current_user_role() in ('manager', 'admin'))
    )
  );
