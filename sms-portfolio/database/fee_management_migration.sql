-- Monthly class fees, student invoices, and numbered payment receipts.
-- Run after production_security_migration.sql. Safe to rerun.

alter table public.classes
  add column if not exists monthly_fee numeric(10, 2),
  add column if not exists fee_due_day smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'classes_monthly_fee_check'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint classes_monthly_fee_check
      check (monthly_fee is null or monthly_fee >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'classes_fee_due_day_check'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint classes_fee_due_day_check
      check (fee_due_day is null or fee_due_day between 1 and 31);
  end if;
end $$;

alter table public.fees
  add column if not exists fee_month date;

create unique index if not exists idx_fees_student_month
  on public.fees(student_id, fee_month)
  where fee_month is not null;

create sequence if not exists public.fee_receipt_seq;
alter table public.fee_payments
  add column if not exists receipt_no text,
  add column if not exists remaining_balance numeric(10, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.fee_payments'::regclass
      and confrelid = 'public.fees'::regclass
      and contype = 'f'
  ) then
    alter table public.fee_payments
      add constraint fee_payments_fee_id_fkey
      foreign key (fee_id) references public.fees(id) on delete cascade;
  end if;
end $$;

update public.fee_payments
set receipt_no = 'FEE-' || lpad(nextval('public.fee_receipt_seq')::text, 10, '0')
where receipt_no is null;

alter table public.fee_payments
  alter column receipt_no set default ('FEE-' || lpad(nextval('public.fee_receipt_seq')::text, 10, '0')),
  alter column receipt_no set not null;

create unique index if not exists idx_fee_payments_receipt_no
  on public.fee_payments(receipt_no);

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
  where public.fees.amount_paid = 0;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.ensure_monthly_fee_records(date) from public, anon;
grant execute on function public.ensure_monthly_fee_records(date) to authenticated;

drop function if exists public.record_fee_payment(uuid, numeric, date);
create function public.record_fee_payment(
  p_fee_id uuid,
  p_amount numeric,
  p_paid_on date default current_date
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
    raise exception 'Fee invoice was not found.';
  end if;
  if fee_record.amount_paid + p_amount > fee_record.amount then
    raise exception 'Payment exceeds the outstanding balance.';
  end if;

  remaining := fee_record.amount - fee_record.amount_paid - p_amount;
  insert into public.fee_payments (fee_id, amount, paid_on, remaining_balance)
  values (p_fee_id, p_amount, p_paid_on, remaining)
  returning * into payment_record;

  update public.fees
  set amount_paid = fee_record.amount_paid + p_amount,
      status = case
        when remaining = 0 then 'paid'::public.fee_status
        else 'partial'::public.fee_status
      end,
      paid_on = p_paid_on
  where id = p_fee_id
  returning * into updated_fee;

  return jsonb_build_object(
    'payment_id', payment_record.id,
    'receipt_no', payment_record.receipt_no,
    'paid_on', payment_record.paid_on,
    'amount_paid', payment_record.amount,
    'remaining_balance', payment_record.remaining_balance,
    'fee_id', updated_fee.id,
    'fee_month', updated_fee.fee_month,
    'title', updated_fee.title
  );
end;
$$;
revoke all on function public.record_fee_payment(uuid, numeric, date) from public, anon;
grant execute on function public.record_fee_payment(uuid, numeric, date) to authenticated;

notify pgrst, 'reload schema';
