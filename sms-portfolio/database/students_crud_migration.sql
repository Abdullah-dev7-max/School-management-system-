-- Students page schema migration.
-- Run after schema.sql and step2_migration.sql.
-- Access policies are installed by production_security_migration.sql.

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
