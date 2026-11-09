-- Rename every existing demo user (admin, teachers, parents, and students).
-- Run in Supabase SQL Editor after schema.sql and step2_migration.sql.
-- Safe to re-run. Does not change emails, roles, IDs, or related records.
update public.users
set full_name = 'Abdullah Rauf';
