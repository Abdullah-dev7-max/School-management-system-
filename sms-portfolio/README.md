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

These scripts are safe to rerun and do not reset existing tables. The last
migration removes only the former application's known deterministic sample
accounts, their dependent records, and its sample notices.

### Initial administrator account

Before creating an account, add the one permitted initial admin email in SQL
Editor, replacing the value with the institute administrator's actual email:

```sql
insert into public.admin_signup_allowlist (id, email)
values (true, lower(trim('admin@your-institute.org')))
on conflict (id) do update set email = excluded.email;
```

Enable email/password sign-in and email confirmation in Supabase
**Authentication → Providers**. The app exposes initial signup only while the
allowlist is populated. A database trigger accepts only that exact email,
creates its admin profile, and consumes the allowlist entry. Subsequent public
signups are rejected by the database trigger. The signup form also requires a
12-character password; configure Supabase Auth's password policy and rate
limits to enforce the institute's deployment requirements.

For an existing database, back it up first, confirm that the first four schema
scripts have been applied, and then run
`database/production_security_migration.sql`. This migration removes the known
former demo seed records and replaces the old anonymous policies with
authenticated admin-only policies. A deployment already containing a real
Supabase Auth administrator should link that account to its `public.users`
profile before using the app rather than bootstrapping a second admin.

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

- Dashboard (`/` and `/dashboard`): live counts, attendance, fee balances,
  revenue, and student records from Supabase. The compact greeting uses the
  authenticated administrator's database name and the current local date/time.
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
  revoked; authenticated operations require the linked administrator profile.
  The database policy is the security boundary, not the UI.
- The role switcher and unauthenticated teacher/student/parent portals have been
  removed. Student and teacher contact records created by the admin are not
  Supabase Auth accounts.
- Use a separate Supabase project per institute. This schema is single-institute
  and does not provide tenant isolation for multiple schools in one database.
- Configure Supabase Auth email confirmation, password policy, rate limiting,
  backups, monitoring, and recovery procedures before deployment. Do not expose
  student information through public storage or external logs.
