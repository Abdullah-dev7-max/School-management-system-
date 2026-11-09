-- =====================================================================
-- Scholara SMS · Step 2 migration
-- Run AFTER schema.sql. Safe to re-run.
-- Adds notices and timetable slots. Access policies are installed by the
-- production_security_migration.sql migration.
-- =====================================================================

-- ---------- 1. Notices ----------
create table if not exists notices (
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
create table if not exists timetable_slots (
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
create index if not exists idx_timetable_teacher on timetable_slots(teacher_id);
create index if not exists idx_timetable_class   on timetable_slots(class_id);

-- ---------- 3. RLS ----------
alter table notices         enable row level security;
alter table timetable_slots enable row level security;
