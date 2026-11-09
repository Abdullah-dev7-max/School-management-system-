-- =====================================================================
-- Scholara SMS · Supabase / PostgreSQL schema
-- Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: the reset block at the top drops and rebuilds everything.
-- Fees are denominated in PKR.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- 0. Reset (re-runnable) ----------
drop table if exists marks      cascade;
drop table if exists fees       cascade;
drop table if exists attendance cascade;
drop table if exists students   cascade;
drop table if exists classes    cascade;
drop table if exists teachers   cascade;
drop table if exists users      cascade;
drop type  if exists user_role         cascade;
drop type  if exists attendance_status cascade;
drop type  if exists fee_status        cascade;

-- ---------- 1. Enums ----------
create type user_role         as enum ('admin', 'teacher', 'student', 'parent');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');
create type fee_status        as enum ('paid', 'partial', 'pending', 'overdue');

-- ---------- 2. Tables ----------
-- Every person in the app. No Supabase Auth: roles are switched in the UI.
create table users (
  id          uuid primary key default gen_random_uuid(),
  full_name   text        not null,
  email       text        not null unique,
  role        user_role   not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table teachers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null unique references users(id) on delete cascade,
  employee_code  text        not null unique,
  subject        text        not null,
  qualification  text,
  joined_on      date,
  created_at     timestamptz not null default now()
);

create table classes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,                 -- e.g. 'Grade 8'
  section           text not null,                 -- e.g. 'A'
  room              text,
  academic_year     text not null default '2026-27',
  class_teacher_id  uuid references teachers(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (name, section, academic_year)
);

create table students (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null unique references users(id) on delete cascade,
  class_id       uuid        references classes(id) on delete set null,
  parent_id      uuid        references users(id)   on delete set null,  -- a user with role 'parent'
  admission_no   text        not null unique,
  roll_no        int,
  status         text        not null default 'active' check (status in ('active', 'inactive', 'withdrawn')),
  date_of_birth  date,
  gender         text check (gender in ('female', 'male', 'other')),
  created_at     timestamptz not null default now()
);

create table attendance (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid              not null references students(id) on delete cascade,
  attended_on  date              not null,
  status       attendance_status not null default 'present',
  marked_by    uuid              references teachers(id) on delete set null,
  note         text,
  created_at   timestamptz       not null default now(),
  unique (student_id, attended_on)
);

create table fees (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid          not null references students(id) on delete cascade,
  title        text          not null,
  amount       numeric(10,2) not null check (amount >= 0),
  amount_paid  numeric(10,2) not null default 0 check (amount_paid >= 0),
  due_date     date          not null,
  paid_on      date,
  status       fee_status    not null default 'pending',
  created_at   timestamptz   not null default now(),
  check (amount_paid <= amount)
);

create table marks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid          not null references students(id) on delete cascade,
  subject     text          not null,
  exam        text          not null,
  score       numeric(5,2)  not null check (score >= 0),
  max_score   numeric(5,2)  not null default 100 check (max_score > 0),
  exam_date   date,
  teacher_id  uuid          references teachers(id) on delete set null,
  created_at  timestamptz   not null default now(),
  unique (student_id, subject, exam),
  check (score <= max_score)
);

-- ---------- 3. Indexes ----------
create index idx_students_class     on students(class_id);
create index idx_students_parent    on students(parent_id);
create index idx_classes_teacher    on classes(class_teacher_id);
create index idx_attendance_date    on attendance(attended_on);
create index idx_attendance_student on attendance(student_id);
create index idx_fees_student       on fees(student_id);
create index idx_fees_status        on fees(status);
create index idx_marks_student      on marks(student_id);

-- ---------- 4. Row Level Security (demo mode) ----------
-- There is no login, so the public anon key needs read access.
-- Writes are intentionally NOT enabled yet; we will add narrow
-- insert/update policies in the step that builds attendance + marks entry.
alter table users      enable row level security;
alter table teachers   enable row level security;
alter table classes    enable row level security;
alter table students   enable row level security;
alter table attendance enable row level security;
alter table fees       enable row level security;
alter table marks      enable row level security;

create policy "demo read users"      on users      for select to anon using (true);
create policy "demo read teachers"   on teachers   for select to anon using (true);
create policy "demo read classes"    on classes    for select to anon using (true);
create policy "demo read students"   on students   for select to anon using (true);
create policy "demo read attendance" on attendance for select to anon using (true);
create policy "demo read fees"       on fees       for select to anon using (true);
create policy "demo read marks"      on marks      for select to anon using (true);
