-- =====================================================================
-- Scholara SMS · Step 3 migration
-- Run order: schema.sql -> step2_migration.sql -> step3_migration.sql
-- Safe to re-run. (Re-running schema.sql drops the view, so run this again after it.)
--
-- Adds:
--   1. student_directory view  -> powers server-side search, filter, sort, paging
--   2. trigram indexes         -> fast ILIKE search
--   3. demo write policies     -> lets the anon key run the CRUD helpers
--   4. realtime publication    -> live attendance / fees / marks updates
--
-- WARNING: section 3 lets anyone holding the public anon key write to these
-- tables. That is acceptable for a no-login portfolio demo with fake data.
-- Before using real data, add Supabase Auth and role-based policies.
-- =====================================================================

-- ---------- 1. Directory view (RLS of the base tables still applies) ----------
create or replace view student_directory
with (security_invoker = true) as
select
  s.id,
  su.full_name,
  su.email,
  s.admission_no,
  s.roll_no,
  s.class_id,
  case when c.id is null then 'Unassigned' else c.name || ' ' || c.section end as class_label,
  pu.full_name                                   as guardian_name,
  att.rate                                       as attendance_rate,   -- last 14 days, %
  coalesce(f.outstanding, 0)                     as outstanding,
  case
    when coalesce(f.overdue_count, 0) > 0 then 'overdue'
    when coalesce(f.outstanding, 0)  > 0 then 'due'
    else 'clear'
  end                                            as fee_state
from students s
join users su        on su.id = s.user_id
left join users pu   on pu.id = s.parent_id
left join classes c  on c.id  = s.class_id
left join lateral (
  select round(
    100.0 * count(*) filter (where a.status in ('present', 'late'))
          / nullif(count(*) filter (where a.status <> 'excused'), 0), 1
  ) as rate
  from attendance a
  where a.student_id = s.id and a.attended_on >= current_date - 13
) att on true
left join lateral (
  select
    sum(greatest(fe.amount - fe.amount_paid, 0))                                   as outstanding,
    count(*) filter (where fe.amount_paid < fe.amount and fe.due_date < current_date) as overdue_count
  from fees fe
  where fe.student_id = s.id
) f on true;

grant select on student_directory to anon, authenticated;

-- ---------- 2. Search indexes ----------
create extension if not exists pg_trgm;
create index if not exists idx_users_name_trgm     on users    using gin (full_name    gin_trgm_ops);
create index if not exists idx_students_adm_trgm   on students using gin (admission_no gin_trgm_ops);

-- ---------- 3. Demo write policies (see warning above) ----------
do $$
declare
  t text;
  op text;
begin
  foreach t in array array['users', 'students', 'teachers', 'classes', 'fees'] loop
    execute format('drop policy if exists "demo insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "demo update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "demo delete %1$s" on public.%1$I', t);
    execute format('create policy "demo insert %1$s" on public.%1$I for insert to anon with check (true)', t);
    execute format('create policy "demo update %1$s" on public.%1$I for update to anon using (true) with check (true)', t);
    execute format('create policy "demo delete %1$s" on public.%1$I for delete to anon using (true)', t);
  end loop;
end $$;

drop policy if exists "demo delete attendance" on attendance;
create policy "demo delete attendance" on attendance for delete to anon using (true);

-- ---------- 4. Realtime ----------
do $$
declare t text;
begin
  foreach t in array array['attendance', 'fees', 'marks'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
