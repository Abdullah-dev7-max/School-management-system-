-- Hashed credentials and server-managed sessions for direct teacher/student records.
-- Run after multirole_auth_migration.sql and before deploying role-auth.

alter table public.teachers
  add column if not exists password text;

alter table public.students
  add column if not exists password text;

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
