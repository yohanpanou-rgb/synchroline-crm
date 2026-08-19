-- Κανονικός κατάλογος νοσοκομείων (π.χ. Σύγγρος) — ξεχωριστός από
-- doctors.institution (ελεύθερο κείμενο, βλ. migration 0018). Αυτός ο
-- πίνακας δίνει μια σταθερή λίστα ονομάτων για το dropdown/επιλογή, και
-- επιτρέπει να "υπάρχει" ένα νοσοκομείο ακόμα κι αν δεν έχει ακόμα κανέναν
-- γιατρό. Δεν είναι FK στο doctors.institution σκόπιμα — ίδια χαλαρή
-- σύνδεση με το πώς είναι φτιαγμένα pharmacies/bricks σε αυτό το schema.
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.institutions enable row level security;

create policy "institutions_select_all" on public.institutions
  for select using (auth.role() = 'authenticated');

create policy "institutions_write_manager" on public.institutions
  for all using (public.current_user_role() in ('manager', 'admin'))
  with check (public.current_user_role() in ('manager', 'admin'));

insert into public.institutions (name) values ('ΣΥΓΓΡΟΣ');
