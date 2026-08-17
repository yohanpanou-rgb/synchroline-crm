-- ΚΡΙΣΙΜΗ ΔΙΟΡΘΩΣΗ ΑΣΦΑΛΕΙΑΣ:
-- Η policy "profiles_update_own" επιτρέπει σε κάθε χρήστη να ενημερώσει τη
-- ΔΙΚΗ ΤΟΥ γραμμή (id = auth.uid()), αλλά RLS policies δεν περιορίζουν ΠΟΙΕΣ
-- ΣΤΗΛΕΣ αλλάζουν — μόνο ΠΟΙΑ ΓΡΑΜΜΗ. Αυτό σήμαινε ότι οποιοσδήποτε
-- συνδεδεμένος χρήστης (π.χ. rep) μπορούσε να κάνει:
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', <own id>)
-- και να αναβαθμίσει μόνος του τον ρόλο του, χωρίς κανέναν έλεγχο — απλή
-- κλήση από το developer console του browser, όχι επίθεση.
--
-- Το RLS δεν μπορεί να συγκρίνει παλιά/νέα τιμή στήλης μέσα σε μια policy,
-- οπότε το φράζουμε με trigger: αν ο ενεργών χρήστης δεν είναι admin,
-- role/is_active επανέρχονται στην παλιά τους τιμή πριν το UPDATE ολοκληρωθεί.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_prevent_self_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_privilege_escalation();
