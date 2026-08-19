-- ΚΡΙΣΙΜΗ ΔΙΟΡΘΩΣΗ: το restrict_doctor_rep_updates() (migration 0012) έκανε
-- `if public.current_user_role() <> 'rep' then return new; end if;`. Όταν
-- η σύνδεση γίνεται με service_role key (π.χ. one-off admin scripts), το
-- auth.uid() είναι NULL, άρα current_user_role() γυρνάει NULL, και
-- `NULL <> 'rep'` αποτιμάται σε NULL — το plpgsql IF το αντιμετωπίζει ως
-- false, οπότε ΔΕΝ γίνεται return new, αλλά πέφτει στον περιοριστικό
-- κλάδο: κάθε στήλη επανέρχεται στην παλιά της τιμή εκτός από rating_cpo.
-- Αποτέλεσμα: ΚΑΘΕ update μέσω service_role σε οποιαδήποτε άλλη στήλη
-- εκτός rating_cpo αποσιωπημένα ακυρωνόταν (το county backfill δεν
-- εφαρμόστηκε ποτέ, παρόλο που το script ανέφερε "success").
create or replace function public.restrict_doctor_rep_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  merged jsonb;
begin
  if coalesce(public.current_user_role(), 'service_role') <> 'rep' then
    return new;
  end if;
  merged := to_jsonb(old) || jsonb_build_object('rating_cpo', new.rating_cpo);
  return jsonb_populate_record(old, merged);
end;
$$;
