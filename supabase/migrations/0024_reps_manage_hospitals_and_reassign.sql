-- Οι reps μπορούν πλέον: (1) να προσθέτουν/αφαιρούν γιατρούς από νοσοκομεία,
-- να δημιουργούν νέο νοσοκομείο, (2) να αλλάζουν τον υπεύθυνο rep ενός
-- γιατρού. Και τα δύο θεωρούνται συνεργατικές, κοινόχρηστες ενέργειες (όχι
-- περιορισμένες στο δικό τους πελατολόγιο) — γι' αυτό νέα, ευρύτερη RLS
-- policy αντί να επεκταθεί η υπάρχουσα ownership-based "doctors_update_rep_rating".

-- institutions: επιτρέπεται σε οποιονδήποτε authenticated να δημιουργήσει
-- νέο νοσοκομείο (π.χ. rep από τη σελίδα Νοσοκομεία)· update/delete
-- παραμένουν αποκλειστικά manager/admin.
create policy "institutions_insert_any" on public.institutions
  for insert with check (auth.role() = 'authenticated');

-- doctors: rep μπορεί να ενημερώσει ΟΠΟΙΑΔΗΠΟΤΕ εγγραφή (όχι μόνο δική του) —
-- η στήλη-επίπεδο προστασία παραμένει στο trigger restrict_doctor_rep_updates
-- (βλ. παρακάτω), άρα ένας rep εξακολουθεί να μην μπορεί να αλλάξει π.χ.
-- brick_code/status ανεξαρτήτως αυτής της policy.
create policy "doctors_update_rep_any" on public.doctors
  for update
  using (public.current_user_role() = 'rep')
  with check (public.current_user_role() = 'rep');

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
    'rating_cpo', new.rating_cpo,
    'institution', new.institution,
    'current_rep_id', new.current_rep_id
  );
  merged := to_jsonb(old) || allowed;
  return jsonb_populate_record(old, merged);
end;
$$;
