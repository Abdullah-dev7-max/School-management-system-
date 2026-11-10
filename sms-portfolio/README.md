# Scholara School Management

An administrator workspace for maintaining institute records in Supabase. All
student, teacher, class, fee, attendance, and marks data is read from the
database; the application does not create sample records.

## Setup

Requirements: Node.js and npm.

From PowerShell:

```powershell
cd .\sms-portfolio
npm ci
Copy-Item .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` using Supabase
**Project Settings → API**. The browser app uses only the public anon key; never
put a `service_role` key in a `VITE_` variable.

In Supabase **SQL Editor**, run these scripts in order:

1. `database/schema.sql`
2. `database/step2_migration.sql`
3. `database/students_crud_migration.sql`
4. `database/management_pages_migration.sql`
5. `database/production_security_migration.sql`
6. `database/multirole_auth_migration.sql`
7. `database/login_profile_link_migration.sql`
8. `database/role_password_auth_migration.sql`
9. `database/role_password_column_migration.sql`
10. `database/role_plaintext_password_migration.sql`

These scripts are safe to rerun and do not reset existing tables. The
production security migration removes only the former application's known
deterministic sample accounts, their dependent records, and sample notices.

### Initial administrator account

Before creating an account, add the one permitted initial admin email in SQL
Editor, replacing the value with the institute administrator's actual email:

```sql
insert into public.admin_signup_allowlist (id, email)
values (true, lower(trim('admin@your-institute.org')))
on conflict (id) do update set email = excluded.email;
```

Enable email/password sign-in and email confirmation in Supabase
**Authentication → Providers**. Login uses Supabase Auth directly. Initial
administrator setup is authorized by the database trigger only when the email
matches the allowlist; the trigger creates the admin profile and consumes that
entry.
Configure Supabase Auth's password policy and rate limits to enforce the
institute's deployment requirements.
Add the deployed site's `/reset-password` URL to the Supabase Auth redirect URL
allowlist so password recovery returns to the password update form.

For an existing database, back it up first, confirm that the first five schema
scripts have been applied, and then run `database/multirole_auth_migration.sql`.
The migrations replace broad anonymous access with authenticated, role-limited
policies. The login profile migration links an existing institute profile to a
Supabase Auth account when their email matches and Supabase confirms the email.

### Staff, student, and parent accounts

From the Admin dashboard's **Quick actions** or the Students and Teachers
management pages, add student and teacher records directly to the database.
Student enrollment creates a `public.users` profile and a linked
`public.students` record, and teacher enrollment creates a linked
`public.teachers` record. The authenticated administrator inserts these
records directly through the Supabase client; neither flow calls Auth signup
or the `manage-accounts` function. Teacher/student passwords are stored in the `password` column. Deploy the
`role-auth` Edge Function with the Supabase CLI (`supabase functions deploy role-auth`). It verifies
credentials and manages expiring server-side sessions; teacher/student
dashboard data is returned only after the session is verified. Keep the
service-role key server-side. Teacher and student password changes update the
stored password.
This configuration stores passwords in plaintext; use it only if this
credential-storage risk is explicitly accepted.
For accounts created before this migration, set an initial password from the
teacher/student management form before the user signs in.

The parent dashboard shows only students explicitly linked through
`students.parent_id`. Teacher/student dashboard requests are scoped by the
server-verified role session. The parent portal remains read-only and RLS
limits it to linked children.

Run the app:

```powershell
npm run dev
```

Other commands:

```powershell
npm run build
npm run preview
```

## Institute operations

- Admin dashboard (`/admin`, `/`, and `/dashboard`): live counts, attendance,
  fee balances, revenue, and student records from Supabase. The compact greeting
  uses the authenticated administrator's database name and current local
  date/time.
- Students (`/students`): create, view, update, and delete student records,
  including class/section assignment.
- Teachers (`/teachers`): create, view, update, and delete staff records.
- Classes (`/classes`): create, view, update, and delete classes and assign
  teachers. Deleting a class unassigns its students and removes its timetable.
- Attendance (`/attendance`): enter and edit daily attendance by class/date.
- Marks (`/marks`): enter and edit examination marks by class, subject, and
  exam.
- Fees (`/fees`): issue student vouchers in PKR, record partial or full
  payments, and review outstanding balances and payment history.
- Settings (`/settings`): update the administrator's database profile and
  institute information.

Admin data pages subscribe to Supabase Realtime changes for immediate refresh.
Ensure the `supabase_realtime` publication remains enabled for the tables added
by the production migration.

## Security and scope

- All institute data tables use row-level security. Anonymous access is
  revoked; authenticated access is scoped to the linked administrator,
  teacher's assigned classes, student's own records, or parent's linked
  children. The database policy is the security boundary, not the UI.
- Use a separate Supabase project per institute. This schema is single-institute
  and does not provide tenant isolation for multiple schools in one database.
- Configure Supabase Auth email confirmation, password policy, rate limiting,
  backups, monitoring, and recovery procedures before deployment. Do not expose
  student information through public storage or external logs.
