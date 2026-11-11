-- Let the active administrator review requests and transfer the single
-- approved Admin role only after the requested Auth email is confirmed.

update public.users u
set auth_user_id = null,
    is_approved = false
where u.role::text = 'admin'
  and u.auth_user_id is not null
  and not exists (
    select 1
    from auth.users a
    where a.id = u.auth_user_id
  );

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
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.role::text = 'admin'
      and u.is_approved
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_signup_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select true;
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
    requested_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
    if requested_username = '' then
      raise exception 'An Admin username is required.';
    end if;

    select u.* into matched_profile
    from public.users u
    where lower(u.email) = lower(trim(new.email))
      and u.role::text = 'admin'
      and u.auth_user_id is null
    order by u.created_at
    limit 1
    for update;

    if found then
      update public.users
      set auth_user_id = new.id,
          full_name = requested_username,
          username = requested_username,
          is_approved = false
      where id = matched_profile.id;
    else
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
    end if;

    return new;
  end if;

  select u.* into matched_profile
  from public.users u
  where lower(u.email) = lower(trim(new.email))
    and u.auth_user_id is null
  order by u.created_at
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
revoke all on function public.create_initial_admin_profile()
  from public, anon, authenticated;

create or replace function public.list_admin_access_requests()
returns table (
  id uuid,
  full_name text,
  email text,
  username text,
  created_at timestamptz,
  email_confirmed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.full_name,
    u.email,
    u.username,
    u.created_at,
    a.email_confirmed_at is not null
  from public.users u
  join auth.users a on a.id = u.auth_user_id
  where public.is_admin()
    and u.role::text = 'admin'
    and not u.is_approved
    and lower(trim(a.email)) = lower(trim(u.email))
  order by u.created_at;
$$;
revoke all on function public.list_admin_access_requests() from public, anon;
grant execute on function public.list_admin_access_requests() to authenticated;

create or replace function public.approve_admin_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_id uuid;
  requested_email text;
  auth_email text;
  requested_name text;
  confirmation_time timestamptz;
begin
  perform pg_advisory_xact_lock(74221, 1);

  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only the current approved Admin can transfer Admin access.';
  end if;

  select u.id, u.email, a.email, u.full_name, a.email_confirmed_at
  into requested_id, requested_email, auth_email, requested_name, confirmation_time
  from public.users u
  join auth.users a on a.id = u.auth_user_id
  where u.id = p_request_id
    and u.role::text = 'admin'
    and not u.is_approved
  for update of u;

  if not found then
    raise exception 'This Admin request is no longer pending.';
  end if;
  if lower(trim(requested_email)) <> lower(trim(auth_email)) then
    raise exception 'The request email does not match its Auth account.';
  end if;
  if confirmation_time is null then
    raise exception 'The applicant must confirm their email before approval.';
  end if;

  update public.users
  set is_approved = false
  where role::text = 'admin'
    and is_approved;

  update public.users
  set is_approved = true
  where id = requested_id;

  return jsonb_build_object(
    'id', requested_id,
    'email', requested_email,
    'full_name', requested_name
  );
end;
$$;
revoke all on function public.approve_admin_request(uuid) from public, anon;
grant execute on function public.approve_admin_request(uuid) to authenticated;

notify pgrst, 'reload schema';
