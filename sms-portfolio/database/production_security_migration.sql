-- Production authorization, initial administrator signup, fee payment ledger,
-- and realtime updates. Run after all other database migrations.

alter table public.users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.classes alter column academic_year drop default;
alter table public.attendance alter column status drop default;
alter table public.marks alter column max_score drop default;

create table if not exists public.institute_settings (
  id            boolean primary key default true check (id),
  school_name   text not null,
  address       text,
  contact_email text not null,
  academic_year text not null,
  updated_at    timestamptz not null default now()
);

create table if not exists public.fee_payments (
  id         uuid primary key default gen_random_uuid(),
  fee_id     uuid not null references public.fees(id) on delete cascade,
  amount     numeric(10,2) not null check (amount > 0),
  paid_on    date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_fee_payments_fee on public.fee_payments(fee_id);

insert into public.fee_payments (fee_id, amount, paid_on)
select id, amount_paid, coalesce(paid_on, created_at::date)
from public.fees f
where amount_paid > 0
  and not exists (
    select 1 from public.fee_payments p where p.fee_id = f.id
  );

-- Remove only records from the former deterministic sample dataset.
delete from public.users
where id in (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000005',
  '30000000-0000-4000-8000-000000000006'
) or lower(email) in (
  'amara.qureshi@scholara.edu',
  'hassan.raza@scholara.edu',
  'sana.malik@scholara.edu',
  'bilal.chaudhry@scholara.edu',
  'imran.ahmed@mail.com',
  'nadia.khan@mail.com',
  'tariq.siddiqui@mail.com',
  'farah.iqbal@mail.com',
  'zara.ahmed@student.scholara.edu',
  'ayaan.khan@student.scholara.edu',
  'hamza.khan@student.scholara.edu',
  'maryam.siddiqui@student.scholara.edu',
  'daniyal.siddiqui@student.scholara.edu',
  'inaya.iqbal@student.scholara.edu'
);

delete from public.classes
where id in (
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003'
);

delete from public.notices
where title in (
  'Mid-term results are published',
  'Parent-teacher meetings on 21 November',
  'Term 2 fee challans are overdue',
  'Winter break starts 22 December',
  'Science fair registrations are open',
  'Library hours extended'
);

create table if not exists public.admin_signup_allowlist (
  id    boolean primary key default true check (id),
  email text not null unique check (email = lower(trim(email)))
);
alter table public.admin_signup_allowlist enable row level security;
revoke all on public.admin_signup_allowlist from public, anon, authenticated;

create or replace function public.admin_signup_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_signup_allowlist where id)
     and not exists (
       select 1 from public.users
       where role = 'admin' and auth_user_id is not null
     );
$$;
revoke all on function public.admin_signup_open() from public;
grant execute on function public.admin_signup_open() to anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.create_initial_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_email text;
  admin_name text;
begin
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
revoke all on function public.create_initial_admin_profile() from public, anon, authenticated;

drop trigger if exists create_initial_admin_profile on auth.users;
create trigger create_initial_admin_profile
  after insert on auth.users
  for each row execute function public.create_initial_admin_profile();

create or replace function public.record_fee_payment(
  p_fee_id uuid,
  p_amount numeric,
  p_paid_on date default current_date
)
returns public.fees
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fee_record public.fees;
  updated_fee public.fees;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;
  if p_paid_on is null or p_paid_on > current_date then
    raise exception 'Payment date cannot be in the future.';
  end if;

  select * into fee_record
  from public.fees
  where id = p_fee_id
  for update;

  if not found then
    raise exception 'Fee voucher was not found.';
  end if;
  if fee_record.amount_paid + p_amount > fee_record.amount then
    raise exception 'Payment exceeds the outstanding balance.';
  end if;

  insert into public.fee_payments (fee_id, amount, paid_on)
  values (p_fee_id, p_amount, p_paid_on);

  update public.fees
  set amount_paid = fee_record.amount_paid + p_amount,
      status = case
        when fee_record.amount_paid + p_amount >= fee_record.amount then 'paid'::public.fee_status
        else 'partial'::public.fee_status
      end,
      paid_on = p_paid_on
  where id = p_fee_id
  returning * into updated_fee;

  return updated_fee;
end;
$$;
revoke all on function public.record_fee_payment(uuid, numeric, date) from public, anon;
grant execute on function public.record_fee_payment(uuid, numeric, date) to authenticated;

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

    execute format('alter table public.%I enable row level security', table_name);
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
      execute 'create policy own_profile_update on public.users for update to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()) and role = ''admin'')';
    else
      execute format(
        'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        table_name
      );
    end if;
  end loop;
end $$;

do $$
declare
  table_name text;
  realtime_tables text[] := array[
    'users', 'teachers', 'classes', 'students', 'attendance', 'fees',
    'marks', 'institute_settings', 'fee_payments'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach table_name in array realtime_tables loop
    if to_regclass(format('public.%I', table_name)) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
