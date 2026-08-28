-- Ειδοποιήσεις εντός εφαρμογής (#13) — π.χ. rep σημειώνει τον manager σε
-- σχόλιο επίσκεψης που χρειάζεται προσοχή.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_notifications_user_unread on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Οποιοσδήποτε authenticated μπορεί να δημιουργήσει ειδοποίηση προς άλλον
-- (π.χ. rep -> manager) — δεν είναι ευαίσθητο, μόνο κείμενο + link.
create policy "notifications_insert_any" on public.notifications
  for insert with check (auth.role() = 'authenticated');
