-- Add public Admin requests with explicit database approval before access.
-- Run after open_initial_admin_signup_migration.sql.

alter table public.users
  add column if not exists username text,
  add column if not exists is_approved boolean not null default false;

create unique index if not exists users_username_lower_unique
  on public.users (lower(trim(username)))
  where username is not null;

create unique index if not exists users_single_approved_admin
  on public.users (role)
  where role = 'admin' and is_approved;

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
      and is_approved
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when role::text = 'admin' and not is_approved then null
    else role
  end
  from public.users
  where auth_user_id = (select auth.uid())
  limit 1;
$$;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.create_initial_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_profile public.users;
  requested_username text;
begin
  if new.email is null then
    raise exception 'An email address is required for institute accounts.';
  end if;

  if new.raw_user_meta_data ->> 'account_type' = 'admin_request' then
    requested_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
    if requested_username = '' then
      raise exception 'An Admin username is required.';
    end if;

    insert into public.users (
      auth_user_id, full_name, email, role, username, is_approved
    )
    values (
      new.id,
      requested_username,
      lower(trim(new.email)),
      'admin',
      requested_username,
      false
    );
    return new;
  end if;

  select * into matched_profile
  from public.users
  where lower(email) = lower(trim(new.email))
    and auth_user_id is null
  order by created_at
  limit 1
  for update;

  if found then
    update public.users
    set auth_user_id = new.id
    where id = matched_profile.id;
    return new;
  end if;

  raise exception 'No matching institute profile is available for this account.';
end;
$$;
revoke all on function public.create_initial_admin_profile() from public, anon, authenticated;

create or replace function public.resolve_current_profile()
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

  if profile_record.role = 'admin' then
    if not profile_record.is_approved then
      raise exception 'Admin approval is pending. Ask the developer to approve this account in the database.';
    end if;
    if auth_record.email_confirmed_at is null then
      raise exception 'Confirm your email address before accessing the Admin dashboard.';
    end if;
  end if;

  return profile_record;
end;
$$;
revoke all on function public.resolve_current_profile() from public, anon;
grant execute on function public.resolve_current_profile() to authenticated;

notify pgrst, 'reload schema';
