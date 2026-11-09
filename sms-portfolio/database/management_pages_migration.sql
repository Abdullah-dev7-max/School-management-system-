-- Required for the Teachers, Classes, Attendance, Fees, and Marks pages.
-- Run after schema.sql and step2_migration.sql. Safe to re-run.
-- These open anon policies are for the fake-data demo only, never production.

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

drop policy if exists "demo insert users" on public.users;
drop policy if exists "demo update users" on public.users;
drop policy if exists "demo delete users" on public.users;
create policy "demo insert users" on public.users for insert to anon with check (true);
create policy "demo update users" on public.users for update to anon using (true) with check (true);
create policy "demo delete users" on public.users for delete to anon using (true);

drop policy if exists "demo insert teachers" on public.teachers;
drop policy if exists "demo update teachers" on public.teachers;
drop policy if exists "demo delete teachers" on public.teachers;
create policy "demo insert teachers" on public.teachers for insert to anon with check (true);
create policy "demo update teachers" on public.teachers for update to anon using (true) with check (true);
create policy "demo delete teachers" on public.teachers for delete to anon using (true);

drop policy if exists "demo insert classes" on public.classes;
drop policy if exists "demo update classes" on public.classes;
drop policy if exists "demo delete classes" on public.classes;
create policy "demo insert classes" on public.classes for insert to anon with check (true);
create policy "demo update classes" on public.classes for update to anon using (true) with check (true);
create policy "demo delete classes" on public.classes for delete to anon using (true);

drop policy if exists "demo update fees" on public.fees;
create policy "demo update fees" on public.fees for update to anon using (true) with check (true);
