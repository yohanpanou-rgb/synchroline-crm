-- Αξιολόγηση πελατολογίου (rating_cpo): κατηγοριοποίηση κάθε γιατρού ως προς
-- τη συνταγογραφική του συμπεριφορά. text + CHECK (όχι native enum) για να
-- είναι εύκολη η προσθήκη νέων τιμών στο μέλλον με ένα ALTER CONSTRAINT,
-- συνεπές με το πώς είναι ήδη φτιαγμένα τα dynamic_category/priority_color/
-- status/hq_type/visit_type σε αυτό το schema.
alter table public.doctors
  add column rating_cpo text not null default 'ΥΔ'
  check (rating_cpo in ('0', '1', '2', '3', 'ΥΔ'));

-- Οι reps χρειάζεται να μπορούν να αλλάξουν την αξιολόγηση των δικών τους
-- γιατρών, αλλά η υπάρχουσα "doctors_write_manager" policy απαγορεύει σε
-- reps ΚΑΘΕ update. Προσθέτουμε νέα permissive policy που τους επιτρέπει
-- UPDATE στους γιατρούς της ανάθεσής τους, ΑΛΛΑ RLS policies περιορίζουν
-- μόνο ΠΟΙΕΣ ΓΡΑΜΜΕΣ αγγίζονται — όχι ΠΟΙΕΣ ΣΤΗΛΕΣ αλλάζουν (ίδιο ζήτημα με
-- το privilege-escalation fix στο profiles, migration 0011). Το κλειδώνουμε
-- με trigger: αν ο ενεργών χρήστης δεν είναι manager/admin, κάθε στήλη
-- επανέρχεται στην παλιά της τιμή ΕΚΤΟΣ από rating_cpo. Χρησιμοποιούμε
-- jsonb αντί για μεμονωμένη λίστα στηλών γιατί ο πίνακας doctors έχει ~20
-- στήλες — πιο ανθεκτικό σε μελλοντικές προσθήκες στηλών από το να
-- απαριθμούνται μία-μία.
create or replace function public.restrict_doctor_rep_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  merged jsonb;
begin
  if public.current_user_role() <> 'rep' then
    return new;
  end if;
  merged := to_jsonb(old) || jsonb_build_object('rating_cpo', new.rating_cpo);
  return jsonb_populate_record(old, merged);
end;
$$;

create trigger trg_doctors_restrict_rep_updates
  before update on public.doctors
  for each row execute function public.restrict_doctor_rep_updates();

create policy "doctors_update_rep_rating" on public.doctors
  for update
  using (
    public.current_user_role() = 'rep'
    and (
      current_rep_id = auth.uid()
      or exists (
        select 1 from public.territory_assignments ta
        where ta.doctor_id = doctors.id
          and ta.rep_id = auth.uid()
          and ta.valid_to is null
      )
    )
  )
  with check (
    public.current_user_role() = 'rep'
    and (
      current_rep_id = auth.uid()
      or exists (
        select 1 from public.territory_assignments ta
        where ta.doctor_id = doctors.id
          and ta.rep_id = auth.uid()
          and ta.valid_to is null
      )
    )
  );
