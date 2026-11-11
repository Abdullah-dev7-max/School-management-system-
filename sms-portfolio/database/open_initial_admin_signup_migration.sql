-- Allow one initial Admin signup while requiring confirmed email for access.
-- Run after admin_signup_recovery_migration.sql.

create or replace function public.admin_signup_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.users
    where role = 'admin'
      and auth_user_id is not null
  )
  and (
    select count(*) <= 1
    from public.users
    where role = 'admin'
      and auth_user_id is null
  );
$$;
revoke all on function public.admin_signup_open() from public;
grant execute on function public.admin_signup_open() to anon, authenticated;

create or replace function public.admin_signup_pending_confirmation()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    join auth.users a on a.id = u.auth_user_id
    where u.role = 'admin'
      and a.email_confirmed_at is null
  );
$$;
revoke all on function public.admin_signup_pending_confirmation() from public;
grant execute on function public.admin_signup_pending_confirmation() to anon, authenticated;

create or replace function public.create_initial_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_profile public.users;
  admin_name text;
  unlinked_admin_count integer;
begin
  perform pg_advisory_xact_lock(74221, 1);

  if new.email is null then
    raise exception 'An email address is required for administrator signup.';
  end if;

  if exists (
    select 1 from public.users
    where role = 'admin' and auth_user_id is not null
  ) then
    raise exception 'The initial administrator setup has already started or is complete.';
  end if;

  select count(*) into unlinked_admin_count
  from public.users
  where role = 'admin'
    and auth_user_id is null;
  if unlinked_admin_count > 1 then
    raise exception 'Admin setup is unavailable because multiple unlinked Admin profiles exist.';
  end if;

  select * into matched_profile
  from public.users
  where role = 'admin'
    and auth_user_id is null
  order by created_at
  limit 1
  for update;

  admin_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if admin_name = '' then
    raise exception 'Administrator full name is required.';
  end if;

  if matched_profile.id is null then
    insert into public.users (auth_user_id, full_name, email, role)
    values (new.id, admin_name, lower(new.email), 'admin');
  else
    update public.users
    set auth_user_id = new.id,
        full_name = admin_name,
        email = lower(new.email)
    where id = matched_profile.id;
  end if;

  delete from public.admin_signup_allowlist where id;
  return new;
end;
$$;
revoke all on function public.create_initial_admin_profile() from public, anon, authenticated;

drop function if exists public.resolve_current_profile();

create function public.resolve_current_profile()
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_record auth.users;
  profile_record public.users;
begin
  if auth.uid() is null then
    raise exception 'Sign in before resolving an institute profile.';
  end if;

  select * into auth_record
  from auth.users
  where id = (select auth.uid());

  if not found or auth_record.email is null then
    raise exception 'The authenticated account does not have an email address.';
  end if;

  select * into profile_record
  from public.users
  where auth_user_id = auth_record.id;

  if not found then
    raise exception 'This account is not linked to an institute profile.';
  end if;

  if profile_record.role = 'admin' and auth_record.email_confirmed_at is null then
    raise exception 'Confirm your email address before accessing the Admin dashboard.';
  end if;

  return profile_record;
end;
$$;
revoke all on function public.resolve_current_profile() from public, anon;
grant execute on function public.resolve_current_profile() to authenticated;

insert into public.admin_signup_allowlist (id, email)
select true, lower(u.email)
from public.users u
where u.role = 'admin'
  and u.auth_user_id is null
  and (select count(*) from public.users where role = 'admin' and auth_user_id is null) = 1
  and not exists (
    select 1 from public.users where role = 'admin' and auth_user_id is not null
  )
on conflict (id) do update set email = excluded.email;
