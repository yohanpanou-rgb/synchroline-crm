-- Ταχυδρομικός κώδικας στους γιατρούς + πίνακας αντιστοίχισης ΤΚ -> brick,
-- ώστε η φόρμα γιατρού να προτείνει αυτόματα brick βάσει ΤΚ (#40). Τα
-- δεδομένα ΤΚ->brick φορτώνονται ξεχωριστά (βλ. scripts/postal_bricks_seed.sql
-- αυτής της συνεδρίας) — μεγάλος όγκος αναφοράς, όχι σχήμα.
alter table public.doctors add column postal_code text;

create table public.postal_code_bricks (
  postal_code text primary key,
  city text,
  brick_code text references public.bricks(code),
  county text
);

alter table public.postal_code_bricks enable row level security;

create policy "postal_code_bricks_select_all" on public.postal_code_bricks
  for select using (auth.role() = 'authenticated');
