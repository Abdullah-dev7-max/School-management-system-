-- Add a fee-scoped accountant role. Run after multirole_auth_migration.sql
-- and accountant_fee_collection_migration.sql.

alter type public.user_role add value if not exists 'accountant';

create or replace function public.is_fee_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.current_app_role()::text = 'accountant';
$$;
revoke all on function public.is_fee_manager() from public, anon;
grant execute on function public.is_fee_manager() to authenticated;

drop policy if exists accountant_student_profiles_select on public.users;
create policy accountant_student_profiles_select
  on public.users for select to authenticated
  using (
    public.current_app_role()::text = 'accountant'
    and role = 'student'::public.user_role
  );
drop policy if exists accountant_classes_select on public.classes;
create policy accountant_classes_select
  on public.classes for select to authenticated
  using (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_students_select on public.students;
create policy accountant_students_select
  on public.students for select to authenticated
  using (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_fee_select on public.fees;
create policy accountant_fee_select
  on public.fees for select to authenticated
  using (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_fee_insert on public.fees;
create policy accountant_fee_insert
  on public.fees for insert to authenticated
  with check (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_fee_update on public.fees;
create policy accountant_fee_update
  on public.fees for update to authenticated
  using (public.current_app_role()::text = 'accountant')
  with check (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_payment_select on public.fee_payments;
create policy accountant_payment_select
  on public.fee_payments for select to authenticated
  using (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_payment_insert on public.fee_payments;
create policy accountant_payment_insert
  on public.fee_payments for insert to authenticated
  with check (public.current_app_role()::text = 'accountant');
drop policy if exists accountant_settings_select on public.institute_settings;
create policy accountant_settings_select
  on public.institute_settings for select to authenticated
  using (public.current_app_role()::text = 'accountant');

grant select on public.users, public.classes, public.students, public.institute_settings to authenticated;
revoke select on public.students from public, anon, authenticated;
grant select (
  id,
  user_id,
  parent_id,
  class_id,
  admission_no,
  roll_no,
  gender,
  status
) on public.students to authenticated;
grant select, insert, update on public.fees to authenticated;
grant select, insert on public.fee_payments to authenticated;

create or replace function public.ensure_monthly_fee_records(p_month date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not public.is_fee_manager() then
    raise exception 'Fee management access is required.';
  end if;
  if p_month is null or p_month <> date_trunc('month', p_month)::date then
    raise exception 'Fee month must be the first day of a month.';
  end if;

  insert into public.fees (student_id, title, amount, amount_paid, due_date, status, fee_month)
  select
    s.id,
    'Monthly tuition - ' || to_char(p_month, 'Mon YYYY'),
    c.monthly_fee,
    0,
    make_date(
      extract(year from p_month)::integer,
      extract(month from p_month)::integer,
      least(c.fee_due_day, extract(day from (p_month + interval '1 month - 1 day'))::integer)
    ),
    'pending'::public.fee_status,
    p_month
  from public.students s
  join public.classes c on c.id = s.class_id
  where s.status = 'active'
    and c.monthly_fee is not null
    and c.monthly_fee > 0
    and c.fee_due_day is not null
  on conflict (student_id, fee_month) where fee_month is not null
  do update set
    title = excluded.title,
    amount = excluded.amount,
    due_date = excluded.due_date
  where public.fees.amount_paid = 0
    and public.fees.discount_total = 0
    and public.fees.late_fine_total = 0;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.generate_monthly_fee_vouchers(
  p_month date,
  p_class_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  eligible_count integer;
begin
  if not public.is_fee_manager() then
    raise exception 'Fee management access is required.';
  end if;
  if p_month is null or p_month <> date_trunc('month', p_month)::date then
    raise exception 'Fee month must be the first day of a month.';
  end if;
  if p_class_id is not null and not exists (
    select 1 from public.classes where id = p_class_id
  ) then
    raise exception 'Selected class was not found.';
  end if;

  select count(*) into eligible_count
  from public.students s
  join public.classes c on c.id = s.class_id
  where s.status = 'active'
    and (p_class_id is null or s.class_id = p_class_id)
    and c.monthly_fee is not null
    and c.monthly_fee > 0
    and c.fee_due_day is not null;

  insert into public.fees (
    student_id, title, amount, amount_paid, due_date, status, fee_month
  )
  select
    s.id,
    'Monthly tuition - ' || to_char(p_month, 'Mon YYYY'),
    c.monthly_fee,
    0,
    make_date(
      extract(year from p_month)::integer,
      extract(month from p_month)::integer,
      least(c.fee_due_day, extract(day from (p_month + interval '1 month - 1 day'))::integer)
    ),
    'pending'::public.fee_status,
    p_month
  from public.students s
  join public.classes c on c.id = s.class_id
  where s.status = 'active'
    and (p_class_id is null or s.class_id = p_class_id)
    and c.monthly_fee is not null
    and c.monthly_fee > 0
    and c.fee_due_day is not null
  on conflict (student_id, fee_month) where fee_month is not null
  do update set
    title = excluded.title,
    amount = excluded.amount,
    due_date = excluded.due_date
  where public.fees.amount_paid = 0
    and public.fees.discount_total = 0
    and public.fees.late_fine_total = 0;

  return eligible_count;
end;
$$;

create or replace function public.record_fee_payment(
  p_fee_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_discount numeric,
  p_late_fine numeric,
  p_payment_mode text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fee_record public.fees;
  updated_fee public.fees;
  payment_record public.fee_payments;
  remaining numeric(10, 2);
begin
  if not public.is_fee_manager() then
    raise exception 'Fee management access is required.';
  end if;
  if p_amount is null or p_amount < 0
    or p_discount is null or p_discount < 0
    or p_late_fine is null or p_late_fine < 0
    or p_amount + p_discount <= 0 then
    raise exception 'Enter a valid payment amount or concession.';
  end if;
  if p_paid_on is null or p_paid_on > current_date then
    raise exception 'Payment date cannot be in the future.';
  end if;
  if p_payment_mode is null
    or p_payment_mode not in ('Cash', 'Bank Transfer', 'Easypaisa/JazzCash', 'Cheque') then
    raise exception 'Select a valid payment method.';
  end if;

  select * into fee_record
  from public.fees
  where id = p_fee_id
  for update;
  if not found then
    raise exception 'Fee invoice was not found.';
  end if;

  remaining := fee_record.amount
    + fee_record.late_fine_total
    - fee_record.discount_total
    - fee_record.amount_paid
    + p_late_fine
    - p_discount
    - p_amount;
  if remaining < 0 then
    raise exception 'Payment and concession exceed the outstanding balance plus the new fine.';
  end if;

  insert into public.fee_payments (
    fee_id, amount, paid_on, discount, late_fine, payment_mode, remaining_balance
  )
  values (
    p_fee_id, p_amount, p_paid_on, p_discount, p_late_fine, p_payment_mode, remaining
  )
  returning * into payment_record;

  update public.fees
  set amount_paid = fee_record.amount_paid + p_amount,
      discount_total = fee_record.discount_total + p_discount,
      late_fine_total = fee_record.late_fine_total + p_late_fine,
      status = case
        when remaining = 0 then 'paid'::public.fee_status
        when fee_record.amount_paid + p_amount + fee_record.discount_total + p_discount > 0
          then 'partial'::public.fee_status
        else 'pending'::public.fee_status
      end,
      paid_on = case when p_amount > 0 then p_paid_on else paid_on end
  where id = p_fee_id
  returning * into updated_fee;

  return jsonb_build_object(
    'payment_id', payment_record.id,
    'receipt_no', payment_record.receipt_no,
    'paid_on', payment_record.paid_on,
    'amount_paid', payment_record.amount,
    'discount', payment_record.discount,
    'late_fine', payment_record.late_fine,
    'payment_mode', payment_record.payment_mode,
    'remaining_balance', payment_record.remaining_balance,
    'fee_id', updated_fee.id,
    'fee_month', updated_fee.fee_month,
    'title', updated_fee.title
  );
end;
$$;

revoke all on function public.ensure_monthly_fee_records(date) from public, anon;
revoke all on function public.generate_monthly_fee_vouchers(date, uuid) from public, anon;
revoke all on function public.record_fee_payment(uuid, numeric, date, numeric, numeric, text) from public, anon;
grant execute on function public.ensure_monthly_fee_records(date) to authenticated;
grant execute on function public.generate_monthly_fee_vouchers(date, uuid) to authenticated;
grant execute on function public.record_fee_payment(uuid, numeric, date, numeric, numeric, text) to authenticated;

notify pgrst, 'reload schema';
