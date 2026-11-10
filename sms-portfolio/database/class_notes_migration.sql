-- Private class materials uploaded by assigned teachers and served by role-auth.
-- Run after role_sessions_migration.sql. Safe to rerun.

create table if not exists public.class_notes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  file_name text not null,
  content_type text not null,
  file_size bigint not null check (file_size between 1 and 10485760),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_notes_class_created
  on public.class_notes(class_id, created_at desc);
create index if not exists idx_class_notes_teacher_created
  on public.class_notes(teacher_id, created_at desc);

alter table public.class_notes enable row level security;
revoke all on public.class_notes from public, anon, authenticated;
grant all on public.class_notes to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'class-notes',
  'class-notes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
