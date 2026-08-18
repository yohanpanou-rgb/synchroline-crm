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
