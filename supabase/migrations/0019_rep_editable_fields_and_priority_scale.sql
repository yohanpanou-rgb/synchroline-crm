-- Οι reps μπορούν πλέον να επεξεργαστούν τα βασικά στοιχεία των δικών τους
-- γιατρών (όχι μόνο rating_cpo) από την καρτέλα γιατρού — περιοχή, στοιχεία
-- επικοινωνίας, προτεραιότητα, φαρμακεία, συνταγογράφηση, σημειώσεις.
-- brick/ανάθεση rep/κατάσταση παραμένουν αποκλειστικά manager/admin (το
-- DoctorForm δεν τα εμφανίζει καν σε μη-manager, και δεν περιλαμβάνονται
-- εδώ στη λίστα επιτρεπόμενων πεδίων — οποιαδήποτε τιμή σταλεί για αυτά
-- από ρόλο 'rep' αγνοείται, ίδιο defense-in-depth pattern με πριν).
create or replace function public.restrict_doctor_rep_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  merged jsonb;
  allowed jsonb;
begin
  if coalesce(public.current_user_role(), 'service_role') <> 'rep' then
    return new;
  end if;
  allowed := jsonb_build_object(
    'full_name_raw', new.full_name_raw,
    'last_name', new.last_name,
    'first_name', new.first_name,
    'region', new.region,
    'county', new.county,
    'specialty', new.specialty,
    'hq_type', new.hq_type,
    'phone_1', new.phone_1,
    'phone_2', new.phone_2,
    'address', new.address,
    'dynamic_category', new.dynamic_category,
    'priority_color', new.priority_color,
    'pharmacy_1', new.pharmacy_1,
    'pharmacy_2', new.pharmacy_2,
    'notes', new.notes,
    'weekly_rx_aknicare', new.weekly_rx_aknicare,
    'weekly_rx_closebax', new.weekly_rx_closebax,
    'weekly_rx_terproline', new.weekly_rx_terproline,
    'weekly_rx_rosacure', new.weekly_rx_rosacure,
    'rating_cpo', new.rating_cpo
  );
  merged := to_jsonb(old) || allowed;
  return jsonb_populate_record(old, merged);
end;
$$;

-- Προτεραιότητα: αριθμητική κλίμακα (1,2,3,...) αντί για χρώματα. Χωρίς
-- CHECK constraint (ελεύθερο text) ώστε να προστίθενται νέα επίπεδα χωρίς
-- migration — ζητήθηκε ρητά ανοιχτό ("1,2,3 κλπ").
alter table public.doctors
  drop constraint if exists doctors_priority_color_check;
