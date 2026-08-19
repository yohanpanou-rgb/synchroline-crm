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
