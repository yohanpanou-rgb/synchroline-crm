-- Καταγραφή ανταγωνιστικών προϊόντων που αναφέρει/χρησιμοποιεί ο γιατρός,
-- ανά επίσκεψη και ανά κατηγορία πάθησης (#38). Η λίστα ανταγωνιστών
-- (Avène, Ducray, A-Derma, Bioderma, LRP, Frezyderm, SVR, Boderm, Rilastil,
-- Froika, Uriage) ζει στον κώδικα (lib/constants/competitors.ts) — όχι
-- ξεχωριστός πίνακας αναφοράς, ίδιο pattern με ACADEMIC_TITLES.
create table public.visit_competitor_mentions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  category text not null check (category in (
    'ΑΚΜΗ', 'ΡΟΔΟΧΡΟΥΣ', 'ΑΤΟΠΙΚΗ ΔΕΡΜΑΤΙΤΙΔΑ', 'ΣΜΗΓΜΑΤΟΡΡΟΪΚΗ ΔΕΡΜΑΤΙΤΙΔΑ', 'ΑΝΑΠΛΑΣΗ/ΑΝΤΙΓΗΡΑΝΣΗ'
  )),
  competitor_name text not null,
  created_at timestamptz not null default now()
);

create index idx_visit_competitor_mentions_visit on public.visit_competitor_mentions(visit_id);

alter table public.visit_competitor_mentions enable row level security;

-- ίδιο scope με visits: rep βλέπει/γράφει τις δικές του, manager/admin όλα.
create policy "visit_competitor_mentions_select" on public.visit_competitor_mentions
  for select using (
    public.current_user_role() in ('manager', 'admin')
    or exists (
      select 1 from public.visits v
      where v.id = visit_competitor_mentions.visit_id and v.rep_id = auth.uid()
    )
  );

create policy "visit_competitor_mentions_write" on public.visit_competitor_mentions
  for all using (
    public.current_user_role() in ('manager', 'admin')
    or exists (
      select 1 from public.visits v
      where v.id = visit_competitor_mentions.visit_id and v.rep_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() in ('manager', 'admin')
    or exists (
      select 1 from public.visits v
      where v.id = visit_competitor_mentions.visit_id and v.rep_id = auth.uid()
    )
  );
