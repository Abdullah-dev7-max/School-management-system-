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
9. `database/role_sessions_migration.sql`
10. `database/class_notes_migration.sql`
11. `database/role_password_column_migration.sql`
12. `database/role_plaintext_password_migration.sql`
13. `database/fee_management_migration.sql`
14. `database/accountant_fee_collection_migration.sql`
15. `database/class_announcements_migration.sql`
16. `database/remove_parent_portal_migration.sql`
17. `database/credential_access_migration.sql`
18. `database/admin_signup_recovery_migration.sql`
19. `database/open_initial_admin_signup_migration.sql`
20. `database/admin_approval_migration.sql`
21. `database/admin_single_active_migration.sql`
22. `database/admin_signup_reopen_after_auth_delete_migration.sql`
23. `database/admin_review_handoff_migration.sql`

These scripts are safe to rerun and do not reset existing tables. The
production security migration removes only the former application's known
deterministic sample accounts, their dependent records, and sample notices.

### Initial administrator account

Enable email/password sign-in and email confirmation in Supabase
**Authentication → Providers**. On the Admin login tab, choose **Create an
Admin account** and enter a username, email, and password. Passwords are
handled by Supabase Auth and are never written to `public.users` in plaintext.
Each request creates an unapproved Admin profile. The applicant must confirm
their email, then the active Admin reviews the request in **Settings → Admin
access requests**. Approving transfers the single active Admin seat to the
applicant and signs out the previous Admin. An unconfirmed request cannot be
approved.

If there is no active Admin to review the first request, bootstrap the first
Admin by replacing the email below and running this one-time query in SQL
Editor. It only approves an Auth-linked, email-confirmed request when no other
Admin is approved:

```sql
update public.users u
set is_approved = true
where lower(trim(u.email)) = lower(trim('admin@example.com'))
  and u.role::text = 'admin'
  and u.auth_user_id is not null
  and exists (
    select 1
    from auth.users a
    where a.id = u.auth_user_id
      and lower(trim(a.email)) = lower(trim(u.email))
      and a.email_confirmed_at is not null
  )
  and not exists (
    select 1
    from public.users active_admin
    where active_admin.role::text = 'admin'
      and active_admin.is_approved
      and active_admin.id <> u.id
  )
returning u.username, u.email, u.is_approved;
```

Approval notification emails are sent by the `admin-access` Edge Function.
Deploy it and configure a Resend sender:

```powershell
supabase functions deploy admin-access
supabase secrets set RESEND_API_KEY=re_... ADMIN_APPROVAL_FROM_EMAIL="Scholara <admin@your-verified-domain>"
```

Verify the sender domain with Resend first. To deliver Supabase signup
confirmation emails reliably and avoid the built-in email rate limit, configure
the provider as custom SMTP under Supabase **Authentication → SMTP Settings**.
Never put an email-provider API key in the browser app or a `VITE_` variable.
If the approval email is not configured or delivery fails, the app reports
that clearly; access transfer remains in effect and the approved Admin can
still sign in.
Configure Supabase Auth's password policy and rate limits to enforce the
institute's deployment requirements.
Add the deployed site's `/reset-password` URL to the Supabase Auth redirect URL
allowlist so password recovery returns to the password update form.

For an existing database, back it up first, confirm that the first five schema
scripts have been applied, and then run `database/multirole_auth_migration.sql`.
Run `database/remove_parent_portal_migration.sql` afterward to prevent new
parent login profiles while preserving any existing guardian links.
Run `database/credential_access_migration.sql` to prevent anonymous access to
user, teacher, and student credential records.
The migrations replace broad anonymous access with authenticated, role-limited
policies. The login profile migration links an existing institute profile to a
Supabase Auth account when their email matches and Supabase confirms the email.
The Admin signup recovery migration repairs an unlinked initial Admin profile
and lets the authorized signup complete by linking the matching email instead
of trying to insert a duplicate profile.
The Admin review handoff migration allows pending requests while preserving
one active Admin. Only that active Admin can review confirmed requests and
transfer access; the database revokes the previous Admin's approval atomically.

### Staff and student accounts

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

Teacher/student dashboard requests are scoped by the server-verified role
session. Parent login and dashboard access are disabled; `students.parent_id` guardian
links are retained for directory/contact data.
To populate a linked test school with 10 teachers, 10 demo classes, and 100
students, run `database/demo_school_seed.sql` in the Supabase SQL Editor. The
seed is idempotent and uses fictional `.test` email addresses and unique
generated passwords. Retrieve the passwords from the `teachers.password` and
`students.password` columns and store/share them securely before using the demo
accounts.

If `database/accountant_rbac_migration.sql` was previously applied to an
existing database, run `database/remove_accountant_role_migration.sql` to
remove the fee-only access policies. Accountant sign-in and routes are not
supported; any legacy `accountant` enum value remains inert in PostgreSQL.

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
  teachers. A teacher sees only classes where they are selected as Class
  teacher. Deleting a class unassigns its students and removes its timetable.
- Timetable (`/timetable`): create and manage weekly class periods, including
  their subject, teacher, time, and room.
- Attendance (`/attendance`): enter and edit daily attendance by class/date.
- Marks (`/marks`): enter and edit examination marks by class, subject, and
  exam.
- Teacher workspace (`/teacher-dashboard`): take attendance, enter examination
  marks, upload class notes, and announce tests, assignments, quizzes, or
  important updates to assigned classes. Private note files are limited to
  10 MB and can be downloaded only by students in the assigned class.
- Student workspace (`/student-dashboard`): view personal attendance, marks,
  weekly class timetable, fee ledger and receipts, teacher notes, and class
  announcements. Student records are returned only for the signed-in student.
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
