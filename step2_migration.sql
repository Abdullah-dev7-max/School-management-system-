-- =====================================================================
-- Scholara SMS · Step 2 migration
-- Run AFTER schema.sql. Safe to re-run.
-- Adds: notices, timetable_slots, demo write policies, revenue history.
-- NOTE: the write policies let the public anon key insert/update attendance
-- and marks. That is fine for a no-login portfolio demo, not for production.
-- =====================================================================

drop table if exists notices        cascade;
drop table if exists timetable_slots cascade;

-- ---------- 1. Notices ----------
create table notices (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  category      text not null default 'general'
                  check (category in ('academic', 'event', 'finance', 'holiday', 'general')),
  audience      text[] not null default '{all}',   -- any of: all, admin, teacher, student, parent
  pinned        boolean not null default false,
  published_at  timestamptz not null default now()
);

-- ---------- 2. Timetable ----------
create table timetable_slots (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid     not null references classes(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 1 and 5),   -- 1 = Monday
  period       smallint not null check (period between 1 and 8),
  starts_at    time     not null,
  ends_at      time     not null,
  subject      text     not null,
  teacher_id   uuid     references teachers(id) on delete set null,
  room         text,
  unique (class_id, day_of_week, period)
);
create index idx_timetable_teacher on timetable_slots(teacher_id);
create index idx_timetable_class   on timetable_slots(class_id);

-- ---------- 3. RLS ----------
alter table notices         enable row level security;
alter table timetable_slots enable row level security;

drop policy if exists "demo read notices"   on notices;
drop policy if exists "demo read timetable" on timetable_slots;
create policy "demo read notices"   on notices         for select to anon using (true);
create policy "demo read timetable" on timetable_slots for select to anon using (true);

drop policy if exists "demo insert attendance" on attendance;
drop policy if exists "demo update attendance" on attendance;
drop policy if exists "demo insert marks"      on marks;
drop policy if exists "demo update marks"      on marks;
create policy "demo insert attendance" on attendance for insert to anon with check (true);
create policy "demo update attendance" on attendance for update to anon using (true) with check (true);
create policy "demo insert marks"      on marks      for insert to anon with check (true);
create policy "demo update marks"      on marks      for update to anon using (true) with check (true);

-- ---------- 4. Seed: notices ----------
insert into notices (title, body, category, audience, pinned, published_at) values
  ('Mid-term results are published',
   'Report cards for Grades 8 and 9 are now in the portal. Please review them before the parent meeting.',
   'academic', '{all}', true, now() - interval '1 day'),
  ('Parent-teacher meetings on 21 November',
   'Meetings run from 9:00 AM to 1:00 PM. Book a slot with your class teacher.',
   'event', '{parent,teacher}', false, now() - interval '2 days'),
  ('Term 2 fee challans are overdue',
   'Term 2 tuition was due on 5 November. A late fee applies after 15 November.',
   'finance', '{parent,student}', true, now() - interval '3 days'),
  ('Winter break starts 22 December',
   'School reopens on 5 January. Transport routes resume the same day.',
   'holiday', '{all}', false, now() - interval '4 days'),
  ('Science fair registrations are open',
   'Teams of up to three students can register with their science teacher until 30 November.',
   'event', '{student,parent,teacher}', false, now() - interval '5 days'),
  ('Library hours extended',
   'The library now stays open until 5:00 PM on weekdays.',
   'general', '{all}', false, now() - interval '6 days');

-- ---------- 5. Seed: timetable ----------
-- 3 subjects x 3 teachers rotate so no teacher is double-booked in a period.
insert into timetable_slots (class_id, day_of_week, period, starts_at, ends_at, subject, teacher_id, room)
select
  c.id,
  d,
  p,
  (array['08:30', '09:20', '10:30', '11:20'])[p]::time,
  (array['09:15', '10:05', '11:15', '12:05'])[p]::time,
  s.subject,
  s.teacher_id,
  c.room
from (
  select cl.*, row_number() over (order by cl.name, cl.section) as ci from classes cl
) c
cross join generate_series(1, 5) as d
cross join generate_series(1, 4) as p
join (values
  (0, 'Mathematics', 'd0000000-0000-4000-8000-000000000001'::uuid),
  (1, 'English',     'd0000000-0000-4000-8000-000000000002'::uuid),
  (2, 'Science',     'd0000000-0000-4000-8000-000000000003'::uuid)
) as s(idx, subject, teacher_id)
  on s.idx = (d + p + c.ci::int) % 3;

-- ---------- 6. Seed: six months of monthly collections (relative to today) ----------
delete from fees where title like 'Activity and transport%';

insert into fees (student_id, title, amount, amount_paid, due_date, paid_on, status)
select
  t.student_id, t.title, t.amt, t.amt, t.due,
  t.due - 3 - (abs(hashtext(t.student_id::text || t.title)) % 4),
  'paid'::fee_status
from (
  select
    s.id as student_id,
    'Activity and transport, ' || to_char(m, 'Mon YYYY') as title,
    11000 + (abs(hashtext(s.id::text)) % 3) * 1000 as amt,
    (m + interval '9 days')::date as due
  from students s
  cross join generate_series(
    date_trunc('month', current_date) - interval '5 months',
    date_trunc('month', current_date),
    interval '1 month'
  ) as m
) t;
