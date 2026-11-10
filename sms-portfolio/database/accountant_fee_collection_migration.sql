-- Add discounts, late fines, and payment methods to fee collection.
-- Run after fee_management_migration.sql. Safe to rerun.

alter table public.fees
  add column if not exists discount_total numeric(10, 2) not null default 0,
  add column if not exists late_fine_total numeric(10, 2) not null default 0;

alter table public.fee_payments
  add column if not exists discount numeric(10, 2) not null default 0,
  add column if not exists late_fine numeric(10, 2) not null default 0,
  add column if not exists payment_mode text not null default 'Cash';

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.fees'::regclass
      and contype = 'c'
      and position('amount_paid <= amount' in pg_get_constraintdef(oid)) > 0
  loop
    execute format('alter table public.fees drop constraint %I', constraint_name);
  end loop;

  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.fee_payments'::regclass
      and contype = 'c'
      and position('amount >' in pg_get_constraintdef(oid)) > 0
  loop
    execute format('alter table public.fee_payments drop constraint %I', constraint_name);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fees_discount_total_nonnegative'
      and conrelid = 'public.fees'::regclass
  ) then
    alter table public.fees
      add constraint fees_discount_total_nonnegative check (discount_total >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'fees_late_fine_total_nonnegative'
      and conrelid = 'public.fees'::regclass
  ) then
    alter table public.fees
      add constraint fees_late_fine_total_nonnegative check (late_fine_total >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'fee_payments_amount_nonnegative'
      and conrelid = 'public.fee_payments'::regclass
  ) then
    alter table public.fee_payments
      add constraint fee_payments_amount_nonnegative check (amount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'fee_payments_amount_or_discount_positive'
      and conrelid = 'public.fee_payments'::regclass
  ) then
    alter table public.fee_payments
      add constraint fee_payments_amount_or_discount_positive check (amount + discount > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'fee_payments_discount_nonnegative'
      and conrelid = 'public.fee_payments'::regclass
  ) then
    alter table public.fee_payments
      add constraint fee_payments_discount_nonnegative check (discount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'fee_payments_late_fine_nonnegative'
      and conrelid = 'public.fee_payments'::regclass
  ) then
    alter table public.fee_payments
      add constraint fee_payments_late_fine_nonnegative check (late_fine >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'fee_payments_payment_mode_check'
      and conrelid = 'public.fee_payments'::regclass
  ) then
    alter table public.fee_payments
      add constraint fee_payments_payment_mode_check
      check (payment_mode in ('Cash', 'Bank Transfer', 'Easypaisa/JazzCash', 'Cheque'));
  end if;
end $$;

create or replace function public.ensure_monthly_fee_records(p_month date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
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
    and public.fees.discount_total = 0;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.ensure_monthly_fee_records(date) from public, anon;
grant execute on function public.ensure_monthly_fee_records(date) to authenticated;

drop function if exists public.record_fee_payment(uuid, numeric, date);
drop function if exists public.record_fee_payment(uuid, numeric, date, numeric, numeric, text);
create function public.record_fee_payment(
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
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
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
revoke all on function public.record_fee_payment(uuid, numeric, date, numeric, numeric, text) from public, anon;
grant execute on function public.record_fee_payment(uuid, numeric, date, numeric, numeric, text) to authenticated;

notify pgrst, 'reload schema';
