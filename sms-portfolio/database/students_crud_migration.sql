-- Students page migration for the no-login demo only.
-- Run after schema.sql and step2_migration.sql.
-- Adds a status field and enables anonymous demo CRUD for student profiles.
-- Do not use these broad policies with real student data.

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

drop policy if exists "demo insert users" on public.users;
drop policy if exists "demo update users" on public.users;
drop policy if exists "demo delete users" on public.users;
create policy "demo insert users" on public.users for insert to anon with check (true);
create policy "demo update users" on public.users for update to anon using (true) with check (true);
create policy "demo delete users" on public.users for delete to anon using (true);

drop policy if exists "demo insert students" on public.students;
drop policy if exists "demo update students" on public.students;
drop policy if exists "demo delete students" on public.students;
create policy "demo insert students" on public.students for insert to anon with check (true);
create policy "demo update students" on public.students for update to anon using (true) with check (true);
create policy "demo delete students" on public.students for delete to anon using (true);
