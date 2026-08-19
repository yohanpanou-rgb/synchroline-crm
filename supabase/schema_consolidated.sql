create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'rep' check (role in ('rep','manager','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Σχεδιαστική σημείωση: το Microsoft OAuth προστίθεται αργότερα ως δεύτερος
-- identity provider στο ΙΔΙΟ auth.users row (το Supabase Auth το χειρίζεται
-- μέσω auth.identities). Το profiles.id παραμένει 1:1 με auth.users.id ό,τι
-- κι αν αλλάξει στο login flow — άρα ΔΕΝ χρειάζεται στήλη "provider" εδώ.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'rep')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create table public.bricks (
  code text primary key,
  name text,
  region text,
  county text,
  created_at timestamptz not null default now()
);
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  full_name_raw text,
  last_name text not null,
  first_name text not null,
  region text,
  county text,
  brick_code text references public.bricks(code),
  dynamic_category text check (dynamic_category in ('Α','Β','Γ')),
  budget_2025 numeric(12,2),
  budget_2026 numeric(12,2),
  disbursed_2025 numeric(12,2),
  disbursed_2026 numeric(12,2),
  incentive_2025 numeric(12,2),
  incentive_2026 numeric(12,2),
  priority_color text check (priority_color in ('green','orange','red')),
  pharmacy_1 text,
  pharmacy_2 text,
  weekly_rx_aknicare numeric(8,2),
  weekly_rx_closebax numeric(8,2),
  weekly_rx_terproline numeric(8,2),
  weekly_rx_rosacure numeric(8,2),
  current_rep_id uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active','pending_approval','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_doctors_current_rep on public.doctors(current_rep_id);
create index idx_doctors_brick on public.doctors(brick_code);
create index idx_doctors_status on public.doctors(status);

create trigger trg_doctors_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

-- hospital_id παραλείπεται σκόπιμα (Φάση 2, μαζί με τον πίνακα hospitals).
create table public.territory_assignments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  rep_id uuid not null references public.profiles(id),
  valid_from date not null default current_date,
  valid_to date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint valid_range check (valid_to is null or valid_to >= valid_from)
);

create index idx_territory_doctor on public.territory_assignments(doctor_id);
create index idx_territory_rep on public.territory_assignments(rep_id);

-- Μόνο μία ενεργή ανάθεση (valid_to is null) ανά γιατρό τη φορά
create unique index uniq_active_assignment_per_doctor
  on public.territory_assignments(doctor_id)
  where valid_to is null;
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint valid_cycle_range check (end_date > start_date)
);

-- Μόνο ένας ενεργός κύκλος τη φορά (βάση για το pacing indicator)
create unique index uniq_active_cycle on public.cycles(is_active) where is_active = true;

create table public.cycle_targets (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles(id),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  target_visits integer not null default 0,
  target_coverage_pct numeric(5,2) not null default 0,
  set_by uuid references public.profiles(id),
  set_at timestamptz not null default now(),
  unique (rep_id, cycle_id)
);
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id),
  rep_id uuid not null references public.profiles(id),
  cycle_id uuid not null references public.cycles(id),
  visit_type text not null default 'normal' check (visit_type in ('normal','joint')),
  status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  scheduled_date date,
  completed_date date,
  notes text,
  location_context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_visits_doctor on public.visits(doctor_id);
create index idx_visits_rep_cycle on public.visits(rep_id, cycle_id);
create index idx_visits_status on public.visits(status);

create trigger trg_visits_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

create table public.visit_products (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  product_name text not null check (product_name in ('aknicare','closebax','terproline','rosacure')),
  samples_given integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (visit_id, product_name)
);
alter table public.profiles enable row level security;
alter table public.bricks enable row level security;
alter table public.doctors enable row level security;
alter table public.territory_assignments enable row level security;
alter table public.cycles enable row level security;
alter table public.cycle_targets enable row level security;
alter table public.visits enable row level security;
alter table public.visit_products enable row level security;

-- profiles
create policy "profiles_select_own_or_manager" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() in ('manager','admin'));

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_write_admin" on public.profiles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- bricks (reference data)
create policy "bricks_select_all" on public.bricks
  for select using (auth.role() = 'authenticated');

create policy "bricks_write_admin" on public.bricks
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- doctors
create policy "doctors_select_scope" on public.doctors
  for select using (
    public.current_user_role() in ('manager','admin')
    or current_rep_id = auth.uid()
    or exists (
      select 1 from public.territory_assignments ta
      where ta.doctor_id = doctors.id
        and ta.rep_id = auth.uid()
        and ta.valid_to is null
    )
  );

create policy "doctors_write_manager" on public.doctors
  for all using (public.current_user_role() in ('manager','admin'))
  with check (public.current_user_role() in ('manager','admin'));

-- Rep μπορεί μόνο να "προτείνει" νέο γιατρό: INSERT με status='pending_approval'
-- και current_rep_id τον εαυτό του (ή null). UPDATE/DELETE — και η έγκριση σε
-- 'active' — παραμένουν αποκλειστικά σε manager/admin (βλ. πολιτική παραπάνω).
create policy "doctors_insert_rep_pending" on public.doctors
  for insert
  with check (
    public.current_user_role() = 'rep'
    and status = 'pending_approval'
    and (current_rep_id is null or current_rep_id = auth.uid())
  );

-- territory_assignments
create policy "territory_select_scope" on public.territory_assignments
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "territory_write_manager" on public.territory_assignments
  for all using (public.current_user_role() in ('manager','admin'))
  with check (public.current_user_role() in ('manager','admin'));

-- cycles (κοινόχρηστη αναφορά)
create policy "cycles_select_all" on public.cycles
  for select using (auth.role() = 'authenticated');

create policy "cycles_write_admin" on public.cycles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- cycle_targets
create policy "cycle_targets_select_scope" on public.cycle_targets
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "cycle_targets_write_admin" on public.cycle_targets
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- visits
create policy "visits_select_scope" on public.visits
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "visits_write_own_or_manager" on public.visits
  for all using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid())
  with check (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

-- visit_products (κληρονομεί scope από τη γονική επίσκεψη)
create policy "visit_products_select_scope" on public.visit_products
  for select using (
    exists (select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid()))
  );

create policy "visit_products_write_scope" on public.visit_products
  for all using (
    exists (select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid()))
  )
  with check (
    exists (select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (public.current_user_role() in ('manager','admin') or v.rep_id = auth.uid()))
  );


-- Πρόσθετα πεδία από το πραγματικό αρχείο πελατολογίου (ΝΕΟ_ΑΡΧΕΙΟ_ΓΙΑΤΡΩΝ),
-- που δεν προβλέπονταν στο αρχικό PRD schema αλλά υπάρχουν στα δεδομένα.
alter table public.doctors
  add column specialty text,
  add column phone_1 text,
  add column phone_2 text,
  add column address text,
  add column notes text,
  add column hq_type text check (hq_type in ('ΕΔΡΑ', 'ΕΠΑΡΧΙΑ'));


-- Ώρα ραντεβού, για την προβολή ημερολογίου (Δευτέρα-Παρασκευή, 09:00-21:00, slots 30').
alter table public.visits
  add column scheduled_time time;


-- Εβδομαδιαίες επισκέψεις φαρμακείων (PRD ενότητα 6). Στόχος 8/εβδομάδα,
-- μπάρα προόδου στο dashboard rep. Χωρίς ξεχωριστό πίνακα φαρμακείων προς
-- το παρόν — pharmacy_name ελεύθερο κείμενο, χτίζεται σταδιακά (ανοιχτό
-- σημείο στο PRD ενότητα 12).
create table public.pharmacy_visits (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles(id),
  cycle_id uuid not null references public.cycles(id),
  visit_date date not null default current_date,
  pharmacy_name text not null,
  nearby_doctor_id uuid references public.doctors(id),
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pharmacy_visits_rep_date on public.pharmacy_visits(rep_id, visit_date);
create index idx_pharmacy_visits_cycle on public.pharmacy_visits(cycle_id);

create trigger trg_pharmacy_visits_updated_at
  before update on public.pharmacy_visits
  for each row execute function public.set_updated_at();

alter table public.pharmacy_visits enable row level security;

create policy "pharmacy_visits_select_scope" on public.pharmacy_visits
  for select using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());

create policy "pharmacy_visits_write_own_or_manager" on public.pharmacy_visits
  for all using (public.current_user_role() in ('manager','admin') or rep_id = auth.uid())
  with check (public.current_user_role() in ('manager','admin') or rep_id = auth.uid());


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


-- Ιστορικό αλλαγών (audit log): γενική, trigger-based καταγραφή σε
-- doctors/visits/cycle_targets/territory_assignments/pharmacy_visits.
-- Ένα function ("log_activity") εξυπηρετεί όλους τους πίνακες — παίρνει το
-- όνομα πίνακα/ενέργειας από τα TG_TABLE_NAME/TG_OP, οπότε δεν χρειάζεται
-- ξεχωριστό function ανά πίνακα. Ολόκληρη η γραμμή (πριν/μετά) αποθηκεύεται
-- ως jsonb, ώστε το UI να μπορεί να υπολογίσει διαφορά ανά πεδίο χωρίς να
-- χρειάζεται να ξέρει το schema εκ των προτέρων.
create table public.activity_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index idx_audit_log_record on public.activity_audit_log(table_name, record_id, changed_at desc);
create index idx_audit_log_changed_at on public.activity_audit_log(changed_at desc);

alter table public.activity_audit_log enable row level security;

-- Μόνο manager/admin διαβάζουν το ιστορικό. Καμία insert/update/delete
-- policy για authenticated ρόλους — μόνο το SECURITY DEFINER trigger
-- function παρακάτω γράφει σε αυτόν τον πίνακα (τρέχει με τα δικαιώματα
-- του ιδιοκτήτη της function, ίδιο pattern με current_user_role() /
-- handle_new_user() στο υπόλοιπο schema).
create policy "audit_log_select_manager" on public.activity_audit_log
  for select using (public.current_user_role() in ('manager', 'admin'));

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    lower(TG_OP),
    auth.uid(),
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );
  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_doctors_audit
  after insert or update or delete on public.doctors
  for each row execute function public.log_activity();

create trigger trg_visits_audit
  after insert or update or delete on public.visits
  for each row execute function public.log_activity();

create trigger trg_cycle_targets_audit
  after insert or update or delete on public.cycle_targets
  for each row execute function public.log_activity();

create trigger trg_territory_assignments_audit
  after insert or update or delete on public.territory_assignments
  for each row execute function public.log_activity();

create trigger trg_pharmacy_visits_audit
  after insert or update or delete on public.pharmacy_visits
  for each row execute function public.log_activity();


-- Rate limiting / lockout στο login: append-only log αποτυχημένων
-- προσπαθειών ανά email. RLS ενεργό ΧΩΡΙΣ καμία policy — δηλαδή ούτε
-- anon/authenticated μπορούν να διαβάσουν/γράψουν καθόλου, μόνο ο
-- service-role client (createAdminClient) τον οποίο χρησιμοποιεί η
-- signIn() server action. Έτσι η λογική lockout δεν μπορεί να παρακαμφθεί
-- ή να διαβαστεί απευθείας από τον browser.
create table public.login_rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  attempted_at timestamptz not null default now()
);

create index idx_login_rate_limits_identifier on public.login_rate_limits(identifier, attempted_at desc);

alter table public.login_rate_limits enable row level security;


-- Δεδομένα πωλήσεων από το αρχείο SOX (ERP/wholesaler export). Μία γραμμή
-- ανά γραμμή του αρχείου. Κάθε upload αντικαθιστά ολόκληρο τον πίνακα (το
-- αρχείο περιέχει πάντα πλήρες ιστορικό, βλ. import UI) — δεν κρατάμε
-- ιστορικό uploads, μόνο την τελευταία εικόνα.
create table public.sales_records (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  sub_brand text not null,
  nomos text not null,
  delivery_nomos text,
  product_code text not null,
  product_description text,
  customer_code text,
  customer_name text,
  quantity numeric(12, 2) not null default 0,
  net_value numeric(14, 2) not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_sales_records_date on public.sales_records(sale_date);
create index idx_sales_records_nomos on public.sales_records(nomos);
create index idx_sales_records_sub_brand on public.sales_records(sub_brand);
create index idx_sales_records_product_code on public.sales_records(product_code);

alter table public.sales_records enable row level security;

-- Ανάθεση νομού σε rep (πολλοί-προς-πολλούς — π.χ. η Αττική ανατίθεται και
-- στους 3 reps ταυτόχρονα, όχι μοιρασμένη). Ο admin τη διαχειρίζεται μέσω
-- UI· δεν χρειάζεται εγώ να ξέρω εκ των προτέρων όλους τους νομούς.
create table public.sales_territory_reps (
  id uuid primary key default gen_random_uuid(),
  nomos text not null,
  rep_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (nomos, rep_id)
);

create index idx_sales_territory_reps_rep on public.sales_territory_reps(rep_id);

alter table public.sales_territory_reps enable row level security;

create policy "sales_territory_reps_select_scope" on public.sales_territory_reps
  for select using (
    public.current_user_role() in ('manager', 'admin') or rep_id = auth.uid()
  );

create policy "sales_territory_reps_write_admin" on public.sales_territory_reps
  for all using (public.current_user_role() in ('manager', 'admin'))
  with check (public.current_user_role() in ('manager', 'admin'));

-- sales_records: manager/admin βλέπουν τα πάντα· ένας rep βλέπει μόνο
-- γραμμές των νομών που του έχουν ανατεθεί. Μόνο admin γράφει (bulk
-- replace στο import) — οι υπολογισμοί γίνονται server-side στο dashboard
-- query, όχι με RLS aggregate, οπότε το select scope αρκεί.
create policy "sales_records_select_scope" on public.sales_records
  for select using (
    public.current_user_role() in ('manager', 'admin')
    or exists (
      select 1 from public.sales_territory_reps str
      where str.nomos = sales_records.nomos
        and str.rep_id = auth.uid()
    )
  );

create policy "sales_records_write_admin" on public.sales_records
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- Φαρμακεία (κανονικοποιημένη οντότητα) + σύνδεση με γιατρούς. Ξεχωριστό
-- από τα υπάρχοντα doctors.pharmacy_1/pharmacy_2 (ελεύθερο κείμενο) —
-- εκείνα παραμένουν ως έχουν, δεν αντικαθίστανται εδώ.
create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table public.doctor_pharmacies (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  role text not null default 'secondary' check (role in ('primary', 'secondary')),
  created_at timestamptz not null default now(),
  unique (doctor_id, pharmacy_id)
);

-- Το πολύ ένα primary ανά γιατρό.
create unique index uniq_doctor_primary_pharmacy
  on public.doctor_pharmacies(doctor_id) where role = 'primary';

create index idx_doctor_pharmacies_doctor on public.doctor_pharmacies(doctor_id);
create index idx_doctor_pharmacies_pharmacy on public.doctor_pharmacies(pharmacy_id);

alter table public.pharmacies enable row level security;
alter table public.doctor_pharmacies enable row level security;

-- pharmacies: reference data· όλοι οι authenticated διαβάζουν και μπορούν
-- να δημιουργήσουν νέο (το χρειάζεται ο rep από την καρτέλα γιατρού, βλ.
-- "δημιουργία αν δεν υπάρχει")· μόνο manager/admin επεξεργάζονται/διαγράφουν.
create policy "pharmacies_select_all" on public.pharmacies
  for select using (auth.role() = 'authenticated');
create policy "pharmacies_insert_all" on public.pharmacies
  for insert with check (auth.role() = 'authenticated');
create policy "pharmacies_write_manager" on public.pharmacies
  for update using (public.current_user_role() in ('manager', 'admin'));
create policy "pharmacies_delete_manager" on public.pharmacies
  for delete using (public.current_user_role() in ('manager', 'admin'));

-- doctor_pharmacies: ίδιο scope με doctors — ο rep διαχειρίζεται συνδέσεις
-- μόνο στους δικούς του γιατρούς (current_rep_id ή ανοιχτή territory
-- assignment), manager/admin παντού.
create policy "doctor_pharmacies_select_scope" on public.doctor_pharmacies
  for select using (
    exists (
      select 1 from public.doctors d
      where d.id = doctor_pharmacies.doctor_id
        and (
          public.current_user_role() in ('manager', 'admin')
          or d.current_rep_id = auth.uid()
          or exists (
            select 1 from public.territory_assignments ta
            where ta.doctor_id = d.id and ta.rep_id = auth.uid() and ta.valid_to is null
          )
        )
    )
  );

create policy "doctor_pharmacies_write_scope" on public.doctor_pharmacies
  for all using (
    public.current_user_role() in ('manager', 'admin')
    or exists (
      select 1 from public.doctors d
      where d.id = doctor_pharmacies.doctor_id
        and (
          d.current_rep_id = auth.uid()
          or exists (
            select 1 from public.territory_assignments ta
            where ta.doctor_id = d.id and ta.rep_id = auth.uid() and ta.valid_to is null
          )
        )
    )
  )
  with check (
    public.current_user_role() in ('manager', 'admin')
    or exists (
      select 1 from public.doctors d
      where d.id = doctor_pharmacies.doctor_id
        and (
          d.current_rep_id = auth.uid()
          or exists (
            select 1 from public.territory_assignments ta
            where ta.doctor_id = d.id and ta.rep_id = auth.uid() and ta.valid_to is null
          )
        )
    )
  );

-- Συνταγογράφηση/εβδομάδα ανά sub-brand: τα πεδία υπάρχουν ήδη
-- (weekly_rx_aknicare/closebax/terproline/rosacure). Το terproline γίνεται
-- text ώστε να μη χαθούν εύρη τιμών (π.χ. "5-10") από το πηγαίο αρχείο.
alter table public.doctors
  alter column weekly_rx_terproline type text using weekly_rx_terproline::text;


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
