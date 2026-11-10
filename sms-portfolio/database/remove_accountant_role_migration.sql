-- Remove fee-only Accountant access from databases where the former
-- accountant_rbac_migration.sql was applied. Safe to rerun.

drop policy if exists accountant_student_profiles_select on public.users;
drop policy if exists accountant_classes_select on public.classes;
drop policy if exists accountant_students_select on public.students;
drop policy if exists accountant_fee_select on public.fees;
drop policy if exists accountant_fee_insert on public.fees;
drop policy if exists accountant_fee_update on public.fees;
drop policy if exists accountant_payment_select on public.fee_payments;
drop policy if exists accountant_payment_insert on public.fee_payments;
drop policy if exists accountant_settings_select on public.institute_settings;

create or replace function public.is_fee_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin();
$$;
revoke all on function public.is_fee_manager() from public, anon;
grant execute on function public.is_fee_manager() to authenticated;

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

notify pgrst, 'reload schema';
