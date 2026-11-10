-- Enable manually provisioned teacher and student Auth accounts.
-- Run after production_security_migration.sql. Safe to re-run.

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
    raise exception 'An email address is required for institute accounts.';
  end if;

  select * into matched_profile
  from public.users
  where lower(email) = lower(new.email)
    and auth_user_id is null
  order by created_at
  limit 1
  for update;

  if found then
    if matched_profile.role = 'admin' then
      select email into allowed_email
      from public.admin_signup_allowlist
      where id
      for update;

      if allowed_email is null
         or lower(new.email) <> allowed_email
         or exists (
           select 1 from public.users
           where role = 'admin' and auth_user_id is not null
         ) then
        raise exception 'This administrator account is not authorized for initial signup.';
      end if;

      admin_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', matched_profile.full_name, ''));
      if admin_name = '' then
        raise exception 'Administrator full name is required.';
      end if;

      update public.users
      set auth_user_id = new.id, full_name = admin_name
      where id = matched_profile.id;
      delete from public.admin_signup_allowlist where id;
      return new;
    end if;

    update public.users
    set auth_user_id = new.id
    where id = matched_profile.id;
    return new;
  end if;

  select email into allowed_email
  from public.admin_signup_allowlist
  where id
  for update;

  if allowed_email is null
     or lower(new.email) <> allowed_email
     or exists (
       select 1 from public.users
       where role = 'admin' and auth_user_id is not null
     ) then
    raise exception 'No matching institute profile is available for this account.';
  end if;

  admin_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if admin_name = '' then
    raise exception 'Administrator full name is required.';
  end if;

  insert into public.users (auth_user_id, full_name, email, role)
  values (new.id, admin_name, lower(new.email), 'admin');
  delete from public.admin_signup_allowlist where id;
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.users where auth_user_id = (select auth.uid()) limit 1;
$$;

create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where auth_user_id = (select auth.uid()) limit 1;
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.teachers where user_id = public.current_profile_id() limit 1;
$$;

create or replace function public.current_role_class_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(c.id), array[]::uuid[])
  from public.classes c
  where
    (public.current_app_role() = 'teacher' and c.class_teacher_id = public.current_teacher_id())
    or (public.current_app_role() = 'student' and exists (
      select 1 from public.students s
      where s.user_id = public.current_profile_id() and s.class_id = c.id
    ));
$$;

create or replace function public.can_read_student_record(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.students s
    where s.id = target_student_id
      and (
        (public.current_app_role() = 'student' and s.user_id = public.current_profile_id())
        or (public.current_app_role() = 'teacher' and s.class_id = any(public.current_role_class_ids()))
      )
  );
$$;

create or replace function public.can_read_related_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = public.current_profile_id()
    or public.is_admin()
    or (
      public.current_app_role() = 'teacher'
      and exists (
        select 1 from public.students s
        where s.user_id = target_user_id
          and s.class_id = any(public.current_role_class_ids())
      )
    );
$$;

revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.current_teacher_id() from public, anon;
revoke all on function public.current_role_class_ids() from public, anon;
revoke all on function public.can_read_student_record(uuid) from public, anon;
revoke all on function public.can_read_related_user(uuid) from public, anon;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_teacher_id() to authenticated;
grant execute on function public.current_role_class_ids() to authenticated;
grant execute on function public.can_read_student_record(uuid) to authenticated;
grant execute on function public.can_read_related_user(uuid) to authenticated;

do $$
declare
  table_name text;
  policy_record record;
  protected_tables text[] := array[
    'users', 'teachers', 'classes', 'students', 'attendance', 'fees',
    'marks', 'notices', 'timetable_slots', 'institute_settings', 'fee_payments'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_record.policyname, table_name);
    end loop;

    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);

    if table_name = 'users' then
      execute 'create policy admin_all on public.users for all to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'create policy own_profile_select on public.users for select to authenticated using (auth_user_id = (select auth.uid()))';
      execute 'create policy related_profiles_select on public.users for select to authenticated using (public.can_read_related_user(id))';
    elsif table_name = 'teachers' then
      execute 'create policy admin_all on public.teachers for all to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'create policy own_teacher_select on public.teachers for select to authenticated using (user_id = public.current_profile_id() and public.current_app_role() = ''teacher'')';
    elsif table_name = 'classes' then
      execute 'create policy admin_all on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'create policy role_classes_select on public.classes for select to authenticated using (id = any(public.current_role_class_ids()))';
    elsif table_name = 'students' then
      execute 'create policy admin_all on public.students for all to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'create policy related_students_select on public.students for select to authenticated using (user_id = public.current_profile_id() or (public.current_app_role() = ''teacher'' and class_id = any(public.current_role_class_ids())))';
    elsif table_name in ('attendance', 'fees', 'marks') then
      execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', table_name);
      execute format('create policy related_records_select on public.%I for select to authenticated using (public.can_read_student_record(student_id))', table_name);
    elsif table_name = 'fee_payments' then
      execute 'create policy admin_all on public.fee_payments for all to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'create policy related_payments_select on public.fee_payments for select to authenticated using (exists (select 1 from public.fees f where f.id = fee_id and public.can_read_student_record(f.student_id)))';
    elsif table_name = 'timetable_slots' then
      execute 'create policy admin_all on public.timetable_slots for all to authenticated using (public.is_admin()) with check (public.is_admin())';
      execute 'create policy role_timetable_select on public.timetable_slots for select to authenticated using (teacher_id = public.current_teacher_id() or class_id = any(public.current_role_class_ids()))';
    else
      execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', table_name);
    end if;
  end loop;
end $$;
