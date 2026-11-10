-- Create the server-managed sessions table required by role-auth.
-- Safe to rerun.

create table if not exists public.role_sessions (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_role_sessions_expiry
  on public.role_sessions(expires_at);

alter table public.role_sessions enable row level security;
revoke all on public.role_sessions from public, anon, authenticated;
grant all on public.role_sessions to service_role;

notify pgrst, 'reload schema';
