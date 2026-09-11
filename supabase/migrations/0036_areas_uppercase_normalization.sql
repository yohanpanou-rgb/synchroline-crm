-- Οι περιοχές αποθηκεύονται πλέον πάντα σε ΕΛΛΗΝΙΚΑ ΚΕΦΑΛΑΙΑ χωρίς τόνους
-- (ίδια σύμβαση με το υπόλοιπο CRM, π.χ. doctors.county = "ΑΘΗΝΑ"). Πριν
-- ήταν σε Title Case (π.χ. "Κολωνάκι") -- κανονικοποίηση seed δεδομένων +
-- ενημέρωση create_area_safe ώστε κάθε νέα περιοχή αποθηκεύεται ήδη σωστά.

update areas
set canonical_name = immutable_unaccent(upper(canonical_name)),
    aliases = (
      select coalesce(array_agg(immutable_unaccent(upper(a))), '{}')
      from unnest(aliases) a
    );

create or replace function create_area_safe(name text, p_lat numeric default null, p_lon numeric default null)
returns table(id uuid, canonical_name text, was_existing boolean)
language plpgsql security definer set search_path = public as $$
declare
  existing record;
  new_id uuid;
  normalized text;
begin
  normalized := immutable_unaccent(upper(trim(name)));
  select * into existing from find_similar_area(normalized, 0.6) limit 1;
  if found then
    return query select existing.id, existing.canonical_name, true;
    return;
  end if;
  insert into areas (canonical_name, lat, lon, created_by)
  values (normalized, p_lat, p_lon, auth.uid())
  returning areas.id into new_id;
  return query select new_id, normalized, false;
end;
$$;
