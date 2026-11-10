-- =====================================================================
-- Scholara SMS · Supabase / PostgreSQL schema
-- Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run. Existing production data is preserved.
-- Fees are denominated in PKR.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- 1. Enums ----------
do $$ begin create type user_role as enum ('admin', 'accountant', 'teacher', 'student', 'parent');
exception when duplicate_object then null; end $$;
do $$ begin create type attendance_status as enum ('present', 'absent', 'late', 'excused');
exception when duplicate_object then null; end $$;
do $$ begin create type fee_status as enum ('paid', 'partial', 'pending', 'overdue');
exception when duplicate_object then null; end $$;

-- ---------- 2. Tables ----------
-- People records are created by institute administrators. Admin accounts use
-- Supabase Auth; teacher/student accounts use the role-auth service.
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name   text        not null,
  email       text        not null unique,
  role        user_role   not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists teachers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null unique references users(id) on delete cascade,
  employee_code  text        not null unique,
  subject        text        not null,
  qualification  text,
  joined_on      date,
  password      text,
  created_at     timestamptz not null default now()
);

create table if not exists classes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,                 -- e.g. 'Grade 8'
  section           text not null,                 -- e.g. 'A'
  room              text,
  academic_year     text not null,
  class_teacher_id  uuid references teachers(id) on delete set null,
  monthly_fee       numeric(10, 2) check (monthly_fee is null or monthly_fee >= 0),
  fee_due_day       smallint check (fee_due_day is null or fee_due_day between 1 and 31),
  created_at        timestamptz not null default now(),
  unique (name, section, academic_year)
);

create table if not exists students (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null unique references users(id) on delete cascade,
  class_id       uuid        references classes(id) on delete set null,
  parent_id      uuid        references users(id)   on delete set null,  -- a user with role 'parent'
  admission_no   text        not null unique,
  roll_no        int,
  status         text        not null default 'active' check (status in ('active', 'inactive', 'withdrawn')),
  password      text,
  date_of_birth  date,
  gender         text check (gender in ('female', 'male', 'other')),
  created_at     timestamptz not null default now()
);

create table if not exists attendance (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid              not null references students(id) on delete cascade,
  attended_on  date              not null,
  status       attendance_status not null,
  marked_by    uuid              references teachers(id) on delete set null,
  note         text,
  created_at   timestamptz       not null default now(),
  unique (student_id, attended_on)
);

create table if not exists fees (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid          not null references students(id) on delete cascade,
  title        text          not null,
  amount       numeric(10,2) not null check (amount >= 0),
  amount_paid  numeric(10,2) not null default 0 check (amount_paid >= 0),
  discount_total numeric(10,2) not null default 0 check (discount_total >= 0),
  late_fine_total numeric(10,2) not null default 0 check (late_fine_total >= 0),
  due_date     date          not null,
  fee_month    date,
  paid_on      date,
  status       fee_status    not null default 'pending',
  created_at   timestamptz   not null default now()
);

create table if not exists marks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid          not null references students(id) on delete cascade,
  subject     text          not null,
  exam        text          not null,
  score       numeric(5,2)  not null check (score >= 0),
  max_score   numeric(5,2)  not null check (max_score > 0),
  exam_date   date,
  teacher_id  uuid          references teachers(id) on delete set null,
  created_at  timestamptz   not null default now(),
  unique (student_id, subject, exam),
  check (score <= max_score)
);

create table if not exists institute_settings (
  id            boolean primary key default true check (id),
  school_name   text not null,
  address       text,
  contact_email text not null,
  academic_year text not null,
  updated_at    timestamptz not null default now()
);

create sequence if not exists public.fee_receipt_seq;
create table if not exists fee_payments (
  id         uuid primary key default gen_random_uuid(),
  fee_id     uuid not null references fees(id) on delete cascade,
  amount     numeric(10,2) not null check (amount >= 0),
  paid_on    date not null default current_date,
  discount   numeric(10,2) not null default 0 check (discount >= 0),
  late_fine  numeric(10,2) not null default 0 check (late_fine >= 0),
  payment_mode text not null default 'Cash'
    check (payment_mode in ('Cash', 'Bank Transfer', 'Easypaisa/JazzCash', 'Cheque')),
  receipt_no text not null unique default ('FEE-' || lpad(nextval('public.fee_receipt_seq')::text, 10, '0')),
  remaining_balance numeric(10, 2),
  created_at timestamptz not null default now(),
  check (amount + discount > 0)
);

-- ---------- 3. Indexes ----------
create index if not exists idx_students_class     on students(class_id);
create index if not exists idx_students_parent    on students(parent_id);
create index if not exists idx_classes_teacher    on classes(class_teacher_id);
create index if not exists idx_attendance_date    on attendance(attended_on);
create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_fees_student       on fees(student_id);
create index if not exists idx_fees_status        on fees(status);
create unique index if not exists idx_fees_student_month
  on fees(student_id, fee_month)
  where fee_month is not null;
create index if not exists idx_marks_student      on marks(student_id);
create index if not exists idx_fee_payments_fee   on fee_payments(fee_id);

-- ---------- 4. Row Level Security ----------
alter table users      enable row level security;
alter table teachers   enable row level security;
alter table classes    enable row level security;
alter table students   enable row level security;
alter table attendance enable row level security;
alter table fees       enable row level security;
alter table marks      enable row level security;
alter table institute_settings enable row level security;
alter table fee_payments enable row level security;
