-- Σημαία "είναι και πελάτης Candela/Innova" πάνω σε γιατρό — cross-check με
-- τη λίστα πελατών Candela (matching ονόματος, βλ. one-off script αυτής
-- της συνεδρίας). Ελεύθερο πεδίο, όχι FK — απλή ένδειξη στο UI.
alter table public.doctors
  add column is_candela_client boolean not null default false;
