-- Η προτεραιότητα (priority_color) δεν είναι πλέον ανεξάρτητο χειροκίνητο
-- πεδίο — παράγεται αυτόματα από το rating_cpo (1→'1', 2→'2', 3→'3',
-- ΥΔ/0→καμία προτεραιότητα). Trigger, όχι application code, ώστε να
-- ισχύει από ΟΠΟΥΔΗΠΟΤΕ αλλάζει το rating_cpo (UI, RatingCpoControl,
-- scripts) χωρίς να χρειάζεται να το θυμάται κάθε caller.
create or replace function public.sync_doctor_priority_from_rating()
returns trigger
language plpgsql
as $$
begin
  new.priority_color := case new.rating_cpo
    when '1' then '1'
    when '2' then '2'
    when '3' then '3'
    else null
  end;
  return new;
end;
$$;

-- Το όνομα ξεκινάει με "sync" ώστε αλφαβητικά να τρέχει ΜΕΤΑ το
-- trg_doctors_restrict_rep_updates (r < s) — υπολογίζει priority πάνω στην
-- ΤΕΛΙΚΗ τιμή rating_cpo, μετά τον περιορισμό ανά ρόλο.
create trigger trg_doctors_sync_priority
  before insert or update on public.doctors
  for each row execute function public.sync_doctor_priority_from_rating();

-- Backfill: recompute priority_color για όλους τους υπάρχοντες γιατρούς
-- βάσει του τρέχοντος rating_cpo τους (ο τετριμμένος reassignment πυροδοτεί
-- το BEFORE UPDATE trigger παραπάνω).
update public.doctors set rating_cpo = rating_cpo;
