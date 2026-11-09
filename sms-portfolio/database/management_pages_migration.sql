-- Required for the Teachers, Classes, Attendance, Fees, and Marks pages.
-- Run after schema.sql and step2_migration.sql. Safe to re-run.
-- Access policies are installed by production_security_migration.sql.

alter table public.teachers
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teachers_status_check'
      and conrelid = 'public.teachers'::regclass
  ) then
    alter table public.teachers
      add constraint teachers_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

alter table public.students
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_status_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_status_check
      check (status in ('active', 'inactive', 'withdrawn'));
  end if;
end $$;
