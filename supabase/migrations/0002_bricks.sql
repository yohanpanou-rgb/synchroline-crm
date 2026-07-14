create table public.bricks (
  code text primary key,
  name text,
  region text,
  county text,
  created_at timestamptz not null default now()
);
