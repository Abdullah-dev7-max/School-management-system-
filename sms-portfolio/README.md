# Scholara School Management

A React dashboard prototype for school administrators, teachers, students, and
parents. It uses Vite for development/builds, Tailwind CSS for styling, and
Supabase for school data.

## Run locally

Requirements: Node.js and npm.

From PowerShell:

```powershell
cd .\sms-portfolio
npm install
Copy-Item .env.example .env
```

Edit `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using
Supabase **Project Settings → API**. Use only the public anon key in this
browser app; never put a `service_role` key in a `VITE_` variable. Restart the
dev server after changing environment variables.

In Supabase **SQL Editor**, run these scripts in order to create the database:

1. `database/schema.sql`
2. `database/step2_migration.sql`
3. `database/students_crud_migration.sql`
4. `database/management_pages_migration.sql`

The schema creates empty tables and does not add sample users or school records.
Use the management pages to add real data. `schema.sql` drops and recreates core
tables, so do not rerun it on a database with data you need to keep.

The Students page needs the third migration because it adds enrollment status
and anonymous demo create/update/delete policies. For an existing database,
run only `students_crud_migration.sql` in the SQL Editor; do not rerun
`schema.sql`, which resets core tables.

Teachers, Classes, Attendance, Fees, and Marks use
`database/management_pages_migration.sql` to add teacher status and the demo
write policies needed by those pages. Run it once in the existing demo project.

Then start the site:

```powershell
npm run dev
```

Other commands:

```powershell
npm run build
npm run preview
```

`npm install` creates/updates `package-lock.json`; subsequent clean installs can
use `npm ci`.

## How the app is arranged

- `src/main.jsx` starts React, routing, animation preferences, and the role context.
- `src/App.jsx` defines routes; `src/components/layout/` contains the shared shell.
- `src/config/navigation.js` is the source for role names and menus.
- `src/pages/` contains the role dashboards; `src/components/admin/`,
  `teacher/`, and `portal/` contain their feature UI.
- `src/lib/api.js` is the Supabase data-access layer; `analytics.js` and
  `format.js` provide calculations and formatting.
- `src/hooks/` and `src/context/` hold shared React state and async loading.
- `database/` contains the empty Supabase schema and its migrations.

## What currently works

- Admin dashboard: student/staff totals, fee and attendance summaries, charts,
  and a searchable/filterable student table.
- Students page (`/students`): search and class filter, plus create, edit, and
  delete actions. Deleting a student also deletes their linked attendance,
  marks, and fees.
- Teachers (`/teachers`), Classes (`/classes`), Attendance (`/attendance`),
  Fees (`/fees`), and Marks (`/marks`) management pages; school settings
  (`/settings`) are stored in the current browser's local storage.
- Dashboard greetings use the full name saved in Settings. The compact hero is
  shown on `/` and `/dashboard`, not on management pages.
- Teacher, student, and parent dashboard data requires authenticated user
  identity; those views display a sign-in notice until authentication is added.
- Sidebar, role switcher, responsive layout, and saved sidebar/role preferences.

The dashboards read and write Supabase data. Missing Supabase environment
variables prevent the app from starting; missing database tables or policies
show errors in data-backed screens rather than falling back to sample data.

## Gaps and important limitations

This is currently a **demo/prototype**, not a production school system:

- The role switcher changes a locally stored UI role; there is no login,
  password, or verified user identity. It is not access control. Teacher,
  student, and parent personal dashboards remain unavailable until
  authentication is connected.
- The database policies are intentionally broad for demo use. The anon role can
  read school records, and step 2 allows anon attendance/marks writes. Do not
  put real student data in this setup or deploy it as-is. Production needs
  Supabase Auth and policies that restrict each operation to the signed-in user
  and their permitted role/records.
- `database/schema.sql` drops and recreates core tables. `step2_migration.sql`
  also drops and recreates notices and timetable tables. These scripts can erase
  data; back up the database before applying them to an existing installation.
- The sidebar's search and notification control are visual only. Fee
  management records payments by updating the invoice balance; it does not
  integrate a payment gateway.
- The header search and notification control are visual only. Fee payment,
  user management, and notice management are not implemented.
- There is no automated test or lint script yet. The production build currently
  emits a large JavaScript chunk warning, and `npm audit` reports dependency
  advisories; review/upgrade dependencies before production deployment.

Suggested implementation order: (1) authentication and restrictive database
policies, (2) core admin CRUD pages and route-specific screens, (3) payment and
notification workflows, then (4) automated tests, linting, and production
deployment configuration.
