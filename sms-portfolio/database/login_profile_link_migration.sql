-- Resolve a signed-in Auth user to their institute profile.
-- Links an existing unlinked profile only after Supabase confirms its email.

create or replace function public.resolve_current_profile()
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_record auth.users;
  profile_record public.users;
  email_matches integer;
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

  if found then
    return profile_record;
  end if;

  if auth_record.email_confirmed_at is null then
    raise exception 'Confirm your email address before linking your institute profile.';
  end if;

  select count(*) into email_matches
  from public.users
  where lower(email) = lower(auth_record.email)
    and auth_user_id is null;

  if email_matches = 0 then
    raise exception 'No unlinked institute profile matches this confirmed email address.';
  elsif email_matches > 1 then
    raise exception 'More than one unlinked profile uses this email. Ask your administrator to resolve the duplicate.';
  end if;

  update public.users
  set auth_user_id = auth_record.id
  where id = (
    select id
    from public.users
    where lower(email) = lower(auth_record.email)
      and auth_user_id is null
    for update
  )
  returning * into profile_record;

  if not found then
    raise exception 'The institute profile could not be linked. Please try signing in again.';
  end if;

  return profile_record;
end;
$$;

revoke all on function public.resolve_current_profile() from public, anon;
grant execute on function public.resolve_current_profile() to authenticated;
