-- Prevent new parent login profiles while preserving existing guardian links.
-- Run after multirole_auth_migration.sql. Safe to rerun.

do $$
begin
  if exists (
    select 1 from public.users where role::text = 'parent'
  ) then
    raise exception 'Parent profiles still exist. Review them before disabling the parent role.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_parent_role_disabled'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_parent_role_disabled
      check (role::text <> 'parent');
  end if;
end
$$;
