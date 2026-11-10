-- Create a fictional demo cohort with 10 teachers, 10 classes, and 100 students.
-- Safe to rerun: existing demo account passwords are not changed.
-- Export demo account credentials securely after running this script.

begin;

insert into public.users (full_name, email, role)
select
  'Demo Teacher ' || lpad(i::text, 2, '0'),
  'demo_teacher_' || lpad(i::text, 3, '0') || '@scholara-demo.test',
  'teacher'::public.user_role
from generate_series(1, 10) as numbers(i)
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role;

insert into public.teachers (
  user_id,
  employee_code,
  subject,
  qualification,
  joined_on,
  password,
  status
)
select
  users.id,
  'DEMO-T-' || lpad(numbers.i::text, 3, '0'),
  (array[
    'Mathematics', 'English', 'Urdu', 'General Science', 'Social Studies',
    'Computer Studies', 'Islamiyat', 'Physics', 'Chemistry', 'Biology'
  ])[numbers.i],
  'Demo qualification',
  date '2026-08-01',
  encode(gen_random_bytes(18), 'hex'),
  'active'
from generate_series(1, 10) as numbers(i)
join public.users
  on users.email = 'demo_teacher_' || lpad(numbers.i::text, 3, '0') || '@scholara-demo.test'
on conflict (user_id) do update
set employee_code = excluded.employee_code,
    subject = excluded.subject,
    qualification = excluded.qualification,
    joined_on = excluded.joined_on,
    password = coalesce(teachers.password, excluded.password),
    status = 'active';

insert into public.classes (
  name,
  section,
  academic_year,
  class_teacher_id,
  monthly_fee,
  fee_due_day
)
select
  'Demo Grade ' || numbers.i,
  'A',
  '2026-27',
  teachers.id,
  5000,
  10
from generate_series(1, 10) as numbers(i)
join public.users
  on users.email = 'demo_teacher_' || lpad(numbers.i::text, 3, '0') || '@scholara-demo.test'
join public.teachers on teachers.user_id = users.id
on conflict (name, section, academic_year) do update
set class_teacher_id = excluded.class_teacher_id,
    monthly_fee = excluded.monthly_fee,
    fee_due_day = excluded.fee_due_day;

insert into public.users (full_name, email, role)
select
  'Demo Student ' || lpad(i::text, 3, '0'),
  'demo_student_' || lpad(i::text, 3, '0') || '@scholara-demo.test',
  'student'::public.user_role
from generate_series(1, 100) as numbers(i)
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role;

insert into public.students (
  user_id,
  class_id,
  admission_no,
  roll_no,
  status,
  password
)
select
  users.id,
  classes.id,
  'DEMO-2026-' || lpad(numbers.i::text, 3, '0'),
  ((numbers.i - 1) % 10) + 1,
  'active',
  encode(gen_random_bytes(18), 'hex')
from generate_series(1, 100) as numbers(i)
join public.users
  on users.email = 'demo_student_' || lpad(numbers.i::text, 3, '0') || '@scholara-demo.test'
join public.classes
  on classes.name = 'Demo Grade ' || (((numbers.i - 1) / 10) + 1)
  and classes.section = 'A'
  and classes.academic_year = '2026-27'
on conflict (user_id) do update
set class_id = excluded.class_id,
    admission_no = excluded.admission_no,
    roll_no = excluded.roll_no,
    status = 'active',
    password = coalesce(students.password, excluded.password);

commit;
