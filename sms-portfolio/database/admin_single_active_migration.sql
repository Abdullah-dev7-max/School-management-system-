-- Allow Admin requests only while there is no approved Admin account.
-- Run after admin_approval_migration.sql.

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
      and is_approved
  );
$$;
revoke all on function public.admin_signup_open() from public;
grant execute on function public.admin_signup_open() to anon, authenticated;

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
    perform pg_advisory_xact_lock(74221, 1);

    if exists (
      select 1
      from public.users
      where role = 'admin'
        and is_approved
    ) then
      raise exception 'An Admin already has access. New Admin requests are closed until that account is removed or approval is revoked.';
    end if;

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

notify pgrst, 'reload schema';
