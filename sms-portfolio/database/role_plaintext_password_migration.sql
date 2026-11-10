-- Replace legacy password digests with passwords entered by administrators.
-- Run after role_password_column_migration.sql. Existing account passwords
-- are cleared because their previous values are not plaintext.

alter table public.teachers
  add column if not exists password text;

alter table public.students
  add column if not exists password text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teachers' and column_name = 'password_salt'
  ) then
    update public.teachers set password = null where password_salt is not null;
    alter table public.teachers drop column password_salt;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'password_salt'
  ) then
    update public.students set password = null where password_salt is not null;
    alter table public.students drop column password_salt;
  end if;
end $$;
