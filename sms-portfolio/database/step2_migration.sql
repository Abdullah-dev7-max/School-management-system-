-- =====================================================================
-- Scholara SMS · Step 2 migration
-- Run AFTER schema.sql. Safe to re-run.
-- Adds: notices, timetable_slots, and demo write policies.
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
