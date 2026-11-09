-- =====================================================================
-- Scholara SMS · Supabase / PostgreSQL schema + seed data
-- Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: the reset block at the top drops and rebuilds everything.
-- Currency in the fees table is PKR (change the seed numbers if you like).
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

-- =====================================================================
-- 5. Seed data
-- =====================================================================

-- 5.1 Users: 1 admin, 3 teachers, 4 parents, 6 students
insert into users (id, full_name, email, role, phone) values
  ('10000000-0000-4000-8000-000000000001', 'Abdullah Rauf', 'amara.qureshi@scholara.edu',  'admin',   '+92 300 1000001'),

  ('20000000-0000-4000-8000-000000000001', 'Abdullah Rauf', 'hassan.raza@scholara.edu',    'teacher', '+92 300 2000001'),
  ('20000000-0000-4000-8000-000000000002', 'Abdullah Rauf', 'sana.malik@scholara.edu',     'teacher', '+92 300 2000002'),
  ('20000000-0000-4000-8000-000000000003', 'Abdullah Rauf', 'bilal.chaudhry@scholara.edu', 'teacher', '+92 300 2000003'),

  ('40000000-0000-4000-8000-000000000001', 'Abdullah Rauf', 'imran.ahmed@mail.com',        'parent',  '+92 301 4000001'),
  ('40000000-0000-4000-8000-000000000002', 'Abdullah Rauf', 'nadia.khan@mail.com',         'parent',  '+92 301 4000002'),
  ('40000000-0000-4000-8000-000000000003', 'Abdullah Rauf', 'tariq.siddiqui@mail.com',     'parent',  '+92 301 4000003'),
  ('40000000-0000-4000-8000-000000000004', 'Abdullah Rauf', 'farah.iqbal@mail.com',        'parent',  '+92 301 4000004'),

  ('30000000-0000-4000-8000-000000000001', 'Abdullah Rauf', 'zara.ahmed@student.scholara.edu',     'student', null),
  ('30000000-0000-4000-8000-000000000002', 'Abdullah Rauf', 'ayaan.khan@student.scholara.edu',     'student', null),
  ('30000000-0000-4000-8000-000000000003', 'Abdullah Rauf', 'hamza.khan@student.scholara.edu',     'student', null),
  ('30000000-0000-4000-8000-000000000004', 'Abdullah Rauf', 'maryam.siddiqui@student.scholara.edu','student', null),
  ('30000000-0000-4000-8000-000000000005', 'Abdullah Rauf', 'daniyal.siddiqui@student.scholara.edu','student', null),
  ('30000000-0000-4000-8000-000000000006', 'Abdullah Rauf', 'inaya.iqbal@student.scholara.edu',    'student', null);

-- 5.2 Teachers
insert into teachers (id, user_id, employee_code, subject, qualification, joined_on) values
  ('d0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'T-1001', 'Mathematics', 'MSc Mathematics', '2019-08-15'),
  ('d0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'T-1002', 'English',     'MA English Literature', '2020-01-10'),
  ('d0000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'T-1003', 'Science',     'MSc Physics', '2021-08-20');

-- 5.3 Classes
insert into classes (id, name, section, room, class_teacher_id) values
  ('c0000000-0000-4000-8000-000000000001', 'Grade 8', 'A', 'Room 204', 'd0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'Grade 8', 'B', 'Room 205', 'd0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000003', 'Grade 9', 'A', 'Room 310', 'd0000000-0000-4000-8000-000000000003');

-- 5.4 Students (parent_id points at a user with role 'parent')
insert into students (id, user_id, class_id, parent_id, admission_no, roll_no, date_of_birth, gender) values
  ('e0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'ADM-2026-001', 1, '2012-03-14', 'female'),
  ('e0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'ADM-2026-002', 2, '2012-07-02', 'male'),
  ('e0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'ADM-2026-003', 1, '2012-11-21', 'male'),
  ('e0000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 'ADM-2026-004', 2, '2012-01-30', 'female'),
  ('e0000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'ADM-2026-005', 1, '2011-09-09', 'male'),
  ('e0000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000004', 'ADM-2026-006', 2, '2011-05-18', 'female');

-- 5.5 Attendance: last 14 days, weekdays only, ~80% present / 10% late / 10% absent
insert into attendance (student_id, attended_on, status, marked_by)
select
  s.id,
  d::date,
  case (abs(hashtext(s.id::text || d::date::text)) % 10)
    when 8 then 'late'::attendance_status
    when 9 then 'absent'::attendance_status
    else 'present'::attendance_status
  end,
  c.class_teacher_id
from students s
join classes c on c.id = s.class_id
cross join generate_series(current_date - 13, current_date, interval '1 day') as d
where extract(isodow from d::date) < 6;

-- 5.6 Fees: three line items per student
insert into fees (student_id, title, amount, amount_paid, due_date, paid_on, status)
select s.id, 'Term 1 tuition', 45000, 45000, date '2026-08-10', date '2026-08-05', 'paid'::fee_status
from students s;

insert into fees (student_id, title, amount, amount_paid, due_date, paid_on, status)
select
  s.id,
  'Term 2 tuition',
  45000,
  case (abs(hashtext(s.id::text)) % 3) when 0 then 45000 when 1 then 20000 else 0 end,
  date '2026-11-05',
  case (abs(hashtext(s.id::text)) % 3) when 0 then date '2026-11-03' else null end,
  case (abs(hashtext(s.id::text)) % 3)
    when 0 then 'paid'::fee_status
    when 1 then 'partial'::fee_status
    else 'overdue'::fee_status
  end
from students s;

insert into fees (student_id, title, amount, amount_paid, due_date, status)
select s.id, 'Annual activity fee', 5000, 0, date '2026-12-01', 'pending'::fee_status
from students s;

-- 5.7 Marks: 5 subjects x 2 exams per student (scores between 52 and 97)
insert into marks (student_id, subject, exam, score, max_score, exam_date)
select
  s.id,
  sub.name,
  e.name,
  52 + (abs(hashtext(s.id::text || sub.name || e.name)) % 46),
  100,
  e.held_on
from students s
cross join (values ('Mathematics'), ('English'), ('Science'), ('Urdu'), ('Computer Science')) as sub(name)
cross join (values ('Unit test 1', date '2026-09-15'), ('Mid-term', date '2026-10-20')) as e(name, held_on);

-- ---------- 6. Quick sanity check ----------
-- select role, count(*) from users group by role;
-- select c.name || ' ' || c.section as class, count(s.id) as students
--   from classes c left join students s on s.class_id = c.id group by 1 order by 1;
