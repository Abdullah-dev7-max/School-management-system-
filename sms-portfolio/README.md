# Scholara School Management

A React dashboard prototype for school administrators, teachers, students, and
parents. It uses Vite for development/builds, Tailwind CSS for styling, and
Supabase for the demo data.

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

In Supabase **SQL Editor**, run these scripts in order for the demo database:

1. `database/schema.sql`
2. `database/step2_migration.sql`

To change the names in an already initialized demo database, run
`database/rename_demo_users.sql` as a separate query. It updates user display
names only; emails, roles, IDs, and related school records stay unchanged. New
database seeds use the same display name.

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
- `src/config/navigation.js` is the source for role names, demo profiles, and menus.
- `src/pages/` contains the role dashboards; `src/components/admin/`,
  `teacher/`, and `portal/` contain their feature UI.
- `src/lib/api.js` is the Supabase data-access layer; `analytics.js` and
  `format.js` provide calculations and formatting.
- `src/hooks/` and `src/context/` hold shared React state and async loading.
- `database/` contains the Supabase schema, demo seed data, and second-step
  migration.

## What currently works

- Admin dashboard: sample student/staff totals, fee and attendance summaries,
  charts, and a searchable/filterable student table.
- Teacher dashboard: class attendance, marks entry, and timetable.
- Student and parent dashboards: performance, attendance, fee summaries, and
  school notices. Parents can switch between linked children.
- Sidebar, role switcher, responsive layout, and saved sidebar/role preferences.

The dashboards read and write Supabase data. Missing Supabase environment
variables prevent the app from starting; missing database tables or policies
show errors in data-backed screens rather than falling back to sample data.

## Gaps and important limitations

This is currently a **demo/prototype**, not a production school system:

- The role switcher changes a locally stored demo role; there is no login,
  password, or verified user identity. It is not access control.
- The database policies are intentionally broad for demo use. The anon role can
  read school records, and step 2 allows anon attendance/marks writes. Do not
  put real student data in this setup or deploy it as-is. Production needs
  Supabase Auth and policies that restrict each operation to the signed-in user
  and their permitted role/records.
- `database/schema.sql` drops and recreates core tables. `step2_migration.sql`
  also drops and recreates notices and timetable tables. These scripts can erase
  data; use them only for a disposable demo database, not as production upgrades.
- The sidebar's Students, Teachers, Classes, Fees, Marks, and Settings links
  mostly resolve to `src/pages/Placeholder.jsx`; several dashboard features
  are display-only and do not have full management workflows.
- The header search and notification control are visual only. Fee payment,
  user management, and notice management are not implemented.
- There is no automated test or lint script yet. The production build currently
  emits a large JavaScript chunk warning, and `npm audit` reports dependency
  advisories; review/upgrade dependencies before production deployment.

Suggested implementation order: (1) authentication and restrictive database
policies, (2) core admin CRUD pages and route-specific screens, (3) payment and
notification workflows, then (4) automated tests, linting, and production
deployment configuration.
