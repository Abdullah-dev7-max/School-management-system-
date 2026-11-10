-- Rename the earlier password_hash column to password after installing
-- role_password_auth_migration.sql. Existing values are password digests.
-- Safe to rerun.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teachers' and column_name = 'password_hash'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'teachers' and column_name = 'password'
    ) then
      update public.teachers set password = password_hash where password is null;
      alter table public.teachers drop column password_hash;
    else
      alter table public.teachers rename column password_hash to password;
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'password_hash'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'students' and column_name = 'password'
    ) then
      update public.students set password = password_hash where password is null;
      alter table public.students drop column password_hash;
    else
      alter table public.students rename column password_hash to password;
    end if;
  end if;
end $$;
