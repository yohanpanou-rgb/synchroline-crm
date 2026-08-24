-- Οι reps αποκτούν πλήρη δικαιώματα ίδια με manager/admin στην καρτέλα
-- γιατρού: brick_code, status, academic_title προστίθενται στα πεδία που
-- επιτρέπεται να αλλάξει ένας rep (μαζί με τα ήδη επιτρεπτά από 0019/0024).
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
    'current_rep_id', new.current_rep_id,
    'brick_code', new.brick_code,
    'status', new.status,
    'academic_title', new.academic_title
  );
  merged := to_jsonb(old) || allowed;
  return jsonb_populate_record(old, merged);
end;
$$;
