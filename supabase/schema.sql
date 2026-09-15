create table if not exists public.user_snapshots (
  user_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_snapshots enable row level security;

-- Lexique accesses this table only from its server using SUPABASE_SECRET_KEY.
-- Do not expose the secret key in browser code and do not add a public policy.
