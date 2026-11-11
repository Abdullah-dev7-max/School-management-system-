-- Repair initial Admin signup for databases with an existing unlinked Admin profile.
-- Run after production_security_migration.sql.

create or replace function public.create_initial_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_profile public.users;
  allowed_email text;
  admin_name text;
begin
  if new.email is null then
    raise exception 'An email address is required for administrator signup.';
  end if;

  select email into allowed_email
  from public.admin_signup_allowlist
  where id
  for update;

  if allowed_email is null or lower(new.email) <> allowed_email then
    raise exception 'This email is not authorized for initial administrator signup.';
  end if;

  if exists (
    select 1 from public.users
    where role = 'admin' and auth_user_id is not null
  ) then
    raise exception 'The initial administrator account has already been created.';
  end if;

  select * into matched_profile
  from public.users
  where lower(email) = lower(new.email)
    and role = 'admin'
    and auth_user_id is null
  order by created_at
  limit 1
  for update;

  admin_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', matched_profile.full_name, ''));
  if admin_name = '' then
    raise exception 'Administrator full name is required.';
  end if;

  if matched_profile.id is null then
    insert into public.users (auth_user_id, full_name, email, role)
    values (new.id, admin_name, lower(new.email), 'admin');
  else
    update public.users
    set auth_user_id = new.id,
        full_name = admin_name
    where id = matched_profile.id;
  end if;

  delete from public.admin_signup_allowlist where id;
  return new;
end;
$$;

revoke all on function public.create_initial_admin_profile() from public, anon, authenticated;

do $$
declare
  unlinked_admin_count integer;
  unlinked_admin_email text;
begin
  if exists (
    select 1
    from public.users u
    join auth.users a on a.id = u.auth_user_id
    where u.role = 'admin'
  ) then
    return;
  end if;

  update public.users u
  set auth_user_id = null
  where u.role = 'admin'
    and u.auth_user_id is not null
    and not exists (select 1 from auth.users a where a.id = u.auth_user_id);

  select count(*), min(lower(email))
  into unlinked_admin_count, unlinked_admin_email
  from public.users
  where role = 'admin'
    and auth_user_id is null;

  if unlinked_admin_count = 0 then
    return;
  end if;
  if unlinked_admin_count <> 1 then
    raise exception 'Admin signup recovery stopped: expected one unlinked Admin profile.';
  end if;

  insert into public.admin_signup_allowlist (id, email)
  values (true, unlinked_admin_email)
  on conflict (id) do update set email = excluded.email;
end;
$$;
