-- Κανονικοποιημένος κατάλογος περιοχών Αττικής (dedup/εξορθολογισμός του
-- ελεύθερου-κειμένου πεδίου "Περιοχή" -- doctors.region -- π.χ. "ΚΟΛΟΝΑΚΙ" vs
-- "ΚΟΛΩΝΑΚΙ"). Additive only: το doctors.region ΔΕΝ αγγίζεται/διαγράφεται,
-- προστίθεται μόνο νέα στήλη area_id. Backfill παλιών εγγραφών γίνεται
-- ξεχωριστά, μετά από έγκριση (δεν τρέχει εδώ).

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- unaccent(text) χρησιμοποιεί το search_path-configured dictionary οπότε
-- είναι STABLE, όχι IMMUTABLE -- δεν επιτρέπεται σε generated column/index.
-- Wrapper με ρητό regdictionary είναι IMMUTABLE.
create or replace function immutable_unaccent(text)
returns text language sql immutable parallel safe as $$
  select unaccent('public.unaccent'::regdictionary, $1);
$$;

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  aliases text[] not null default '{}',
  search_key text generated always as (immutable_unaccent(upper(canonical_name))) stored,
  lat numeric,
  lon numeric,
  region text default 'Αττική',
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create index if not exists areas_search_trgm_idx on areas using gin (search_key gin_trgm_ops);
create index if not exists areas_aliases_gin_idx on areas using gin (aliases);

alter table doctors add column if not exists area_id uuid references areas(id);
create index if not exists doctors_area_id_idx on doctors(area_id);

alter table areas enable row level security;

create policy areas_select_authenticated on areas
  for select using (auth.role() = 'authenticated');

-- Καμία plain insert/update/delete policy: η δημιουργία νέας περιοχής γίνεται
-- αποκλειστικά μέσω create_area_safe() (security definer, dedup-guarded).

create or replace function search_areas(q text)
returns table(id uuid, canonical_name text, lat numeric, lon numeric, score real)
language sql stable as $$
  select a.id, a.canonical_name, a.lat, a.lon,
         greatest(
           similarity(a.search_key, immutable_unaccent(upper(q))),
           case when immutable_unaccent(upper(q)) = any(select immutable_unaccent(upper(x)) from unnest(a.aliases) x) then 1.0 else 0 end
         ) as score
  from areas a
  where a.search_key % immutable_unaccent(upper(q))
     or immutable_unaccent(upper(q)) = any(select immutable_unaccent(upper(x)) from unnest(a.aliases) x)
     or a.canonical_name ilike '%'||q||'%'
  order by score desc
  limit 15;
$$;

create or replace function find_similar_area(name text, threshold real default 0.45)
returns table(id uuid, canonical_name text, score real)
language sql stable as $$
  select a.id, a.canonical_name, similarity(a.search_key, immutable_unaccent(upper(name))) as score
  from areas a
  where similarity(a.search_key, immutable_unaccent(upper(name))) > threshold
  order by score desc
  limit 5;
$$;

-- security definer: επιτρέπει σε κάθε authenticated rep να δημιουργήσει νέα
-- περιοχή (χωρίς να χρειάζεται insert policy στο areas), αλλά πάντα μέσα από
-- τον dedup-έλεγχο find_similar_area πρώτα.
create or replace function create_area_safe(name text, p_lat numeric default null, p_lon numeric default null)
returns table(id uuid, canonical_name text, was_existing boolean)
language plpgsql security definer set search_path = public as $$
declare
  existing record;
  new_id uuid;
begin
  select * into existing from find_similar_area(name, 0.6) limit 1;
  if found then
    return query select existing.id, existing.canonical_name, true;
    return;
  end if;
  insert into areas (canonical_name, lat, lon, created_by)
  values (trim(name), p_lat, p_lon, auth.uid())
  returning areas.id into new_id;
  return query select new_id, trim(name), false;
end;
$$;

grant execute on function search_areas(text) to authenticated;
grant execute on function find_similar_area(text, real) to authenticated;
grant execute on function create_area_safe(text, numeric, numeric) to authenticated;

insert into areas (canonical_name, lat, lon, aliases) values
  ('Σύνταγμα', 37.975, 23.735, ARRAY[]::text[]),
  ('Κολωνάκι', 37.979, 23.744, ARRAY['Κολονάκι']),
  ('Εξάρχεια', 37.988, 23.733, ARRAY[]::text[]),
  ('Αμπελόκηποι', 37.989, 23.766, ARRAY[]::text[]),
  ('Πατήσια', 38.018, 23.73, ARRAY[]::text[]),
  ('Γκύζη', 37.994, 23.751, ARRAY[]::text[]),
  ('Μεταξουργείο', 37.985, 23.719, ARRAY[]::text[]),
  ('Ακρόπολη', 37.97, 23.727, ARRAY[]::text[]),
  ('Ταύρος', 37.963, 23.702, ARRAY[]::text[]),
  ('Μοσχάτο', 37.955, 23.682, ARRAY[]::text[]),
  ('Γαλάτσι', 38.018, 23.752, ARRAY[]::text[]),
  ('Ψυχικό', 38.006, 23.772, ARRAY[]::text[]),
  ('Ν. Ψυχικό', 38.008, 23.786, ARRAY['Νέο Ψυχικό','Ν.Ψυχικό']),
  ('Καλλιθέα', 37.955, 23.706, ARRAY[]::text[]),
  ('Ιλίσια', 37.977, 23.762, ARRAY[]::text[]),
  ('Καισαριανή', 37.964, 23.768, ARRAY[]::text[]),
  ('Γουδί', 37.978, 23.762, ARRAY[]::text[]),
  ('Ζωγράφου', 37.975, 23.777, ARRAY[]::text[]),
  ('Παγκράτι', 37.967, 23.751, ARRAY[]::text[]),
  ('Βύρωνας', 37.958, 23.757, ARRAY[]::text[]),
  ('Ηλιούπολη', 37.93, 23.76, ARRAY[]::text[]),
  ('Αργυρούπολη', 37.909, 23.752, ARRAY[]::text[]),
  ('Αγ. Δημήτριος', 37.935, 23.735, ARRAY['Άγιος Δημήτριος','Αγ.Δημήτριος']),
  ('Δάφνη', 37.95, 23.737, ARRAY[]::text[]),
  ('Ν. Σμύρνη', 37.944, 23.717, ARRAY['Νέα Σμύρνη','Ν.Σμύρνη']),
  ('Π. Φάληρο', 37.928, 23.7, ARRAY['Παλαιό Φάληρο','Π.Φάληρο','Παλιό Φάληρο']),
  ('Άλιμος', 37.912, 23.716, ARRAY[]::text[]),
  ('Ελληνικό', 37.89, 23.742, ARRAY[]::text[]),
  ('Γλυφάδα', 37.866, 23.756, ARRAY[]::text[]),
  ('Βούλα', 37.843, 23.776, ARRAY[]::text[]),
  ('Βουλιαγμένη', 37.81, 23.78, ARRAY[]::text[]),
  ('Βάρη', 37.832, 23.806, ARRAY[]::text[]),
  ('Βάρκιζα', 37.815, 23.808, ARRAY[]::text[]),
  ('Ανάβυσσος', 37.735, 23.94, ARRAY[]::text[]),
  ('Κηφισιά', 38.075, 23.815, ARRAY[]::text[]),
  ('Ν. Ερυθραία', 38.092, 23.822, ARRAY['Νέα Ερυθραία','Ν.Ερυθραία']),
  ('Άνοιξη', 38.13, 23.862, ARRAY[]::text[]),
  ('Δροσιά', 38.112, 23.856, ARRAY[]::text[]),
  ('Μαρούσι', 38.054, 23.806, ARRAY[]::text[]),
  ('Μελίσσια', 38.054, 23.838, ARRAY[]::text[]),
  ('Βριλήσσια', 38.035, 23.83, ARRAY[]::text[]),
  ('Χαλάνδρι', 38.02, 23.8, ARRAY[]::text[]),
  ('Αγ. Παρασκευή', 38.01, 23.832, ARRAY['Αγία Παρασκευή','Αγ.Παρασκευή']),
  ('Χολαργός', 38.0, 23.802, ARRAY[]::text[]),
  ('Ν. Ιωνία', 38.04, 23.76, ARRAY['Νέα Ιωνία','Ν.Ιωνία']),
  ('Ηράκλειο', 38.06, 23.772, ARRAY[]::text[]),
  ('Μεταμόρφωση', 38.062, 23.756, ARRAY[]::text[]),
  ('Πεύκη', 38.062, 23.792, ARRAY[]::text[]),
  ('Ν. Πεντέλη', 38.058, 23.86, ARRAY['Νέα Πεντέλη','Ν.Πεντέλη']),
  ('Γέρακας', 38.02, 23.862, ARRAY[]::text[]),
  ('Παλλήνη', 38.005, 23.886, ARRAY[]::text[]),
  ('Γλυκά Νερά', 37.99, 23.86, ARRAY['Γλυκά νερά']),
  ('Παιανία', 37.955, 23.856, ARRAY[]::text[]),
  ('Σπάτα', 37.962, 23.92, ARRAY[]::text[]),
  ('Πικέρμι', 38.002, 23.942, ARRAY[]::text[]),
  ('Ραφήνα', 38.022, 24.002, ARRAY[]::text[]),
  ('Λούτσα', 37.98, 24.01, ARRAY[]::text[]),
  ('Ν. Μάκρη', 38.082, 23.98, ARRAY['Νέα Μάκρη','Ν.Μάκρη']),
  ('Μαραθώνας', 38.155, 23.962, ARRAY[]::text[]),
  ('Ωρωπός', 38.31, 23.79, ARRAY[]::text[]),
  ('Μαρκόπουλο', 37.885, 23.935, ARRAY[]::text[]),
  ('Κορωπί', 37.9, 23.875, ARRAY[]::text[]),
  ('Πόρτο Ράφτη', 37.89, 24.0, ARRAY['Πόρτο-Ράφτη']),
  ('Καλύβια', 37.83, 23.93, ARRAY['Καλύβια Θορικού']),
  ('Κερατέα', 37.808, 23.98, ARRAY[]::text[]),
  ('Λαύριο', 37.712, 24.058, ARRAY[]::text[]),
  ('Περιστέρι', 38.015, 23.69, ARRAY[]::text[]),
  ('Αιγάλεω', 37.99, 23.68, ARRAY[]::text[]),
  ('Χαϊδάρι', 38.01, 23.66, ARRAY['Χαιδάρι']),
  ('Πετρούπολη', 38.04, 23.682, ARRAY[]::text[]),
  ('Ίλιον', 38.03, 23.702, ARRAY[]::text[]),
  ('Αγ. Ανάργυροι', 38.03, 23.722, ARRAY['Άγιοι Ανάργυροι','Αγ.Ανάργυροι']),
  ('Μενίδι', 38.082, 23.735, ARRAY[]::text[]),
  ('Νίκαια', 37.965, 23.646, ARRAY[]::text[]),
  ('Κορυδαλλός', 37.98, 23.652, ARRAY[]::text[]),
  ('Αγ. Βαρβάρα', 37.99, 23.66, ARRAY['Αγία Βαρβάρα','Αγ.Βαρβάρα']),
  ('Πειραιάς', 37.945, 23.648, ARRAY[]::text[]),
  ('Κερατσίνι', 37.96, 23.622, ARRAY[]::text[]),
  ('Δραπετσώνα', 37.95, 23.625, ARRAY[]::text[]),
  ('Πέραμα', 37.965, 23.572, ARRAY[]::text[]),
  ('Ελευσίνα', 38.042, 23.542, ARRAY[]::text[]),
  ('Ασπρόπυργος', 38.062, 23.59, ARRAY[]::text[]),
  ('Μάνδρα', 38.072, 23.5, ARRAY[]::text[]),
  ('Μέγαρα', 37.996, 23.344, ARRAY[]::text[]),
  ('Ν. Πέραμος', 38.0, 23.42, ARRAY['Νέα Πέραμος','Ν.Πέραμος']),
  ('Σαλαμίνα', 37.963, 23.492, ARRAY[]::text[]),
  ('Αίγινα', 37.745, 23.43, ARRAY[]::text[])
on conflict (canonical_name) do nothing;
