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
