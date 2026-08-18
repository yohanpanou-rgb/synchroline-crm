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
