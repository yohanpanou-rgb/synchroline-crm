-- Πρόσθετα πεδία από το πραγματικό αρχείο πελατολογίου (ΝΕΟ_ΑΡΧΕΙΟ_ΓΙΑΤΡΩΝ),
-- που δεν προβλέπονταν στο αρχικό PRD schema αλλά υπάρχουν στα δεδομένα.
alter table public.doctors
  add column specialty text,
  add column phone_1 text,
  add column phone_2 text,
  add column address text,
  add column notes text,
  add column hq_type text check (hq_type in ('ΕΔΡΑ', 'ΕΠΑΡΧΙΑ'));
