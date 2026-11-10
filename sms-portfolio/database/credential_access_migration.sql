-- Keep profile and role-password tables unavailable to anonymous clients.
-- Authenticated administrators retain access; role-auth uses service_role.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where auth_user_id = (select auth.uid())
      and role::text = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on table public.users, public.teachers, public.students from public, anon;
grant select, insert, update, delete on table public.users, public.teachers, public.students to authenticated;
grant all on table public.users, public.teachers, public.students to service_role;

alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array['users', 'teachers', 'students'] loop
    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_name, table_name);
    end loop;

    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      table_name
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
