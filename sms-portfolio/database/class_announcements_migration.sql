-- Teacher announcements scoped to the teacher's assigned classes.
-- Run after class_notes_migration.sql. Safe to rerun.

create table if not exists public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  announcement_type text not null
    check (announcement_type in ('test', 'assignment', 'quiz', 'notice')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  event_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_announcements_class_created
  on public.class_announcements(class_id, created_at desc);
create index if not exists idx_class_announcements_teacher_created
  on public.class_announcements(teacher_id, created_at desc);

alter table public.class_announcements enable row level security;
revoke all on public.class_announcements from public, anon, authenticated;
grant all on public.class_announcements to service_role;

notify pgrst, 'reload schema';
