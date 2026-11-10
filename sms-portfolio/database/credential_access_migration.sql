-- Keep profile and role-password tables unavailable to anonymous clients.
-- Authenticated administrators retain access; role-auth uses service_role.

revoke all on table public.users, public.teachers, public.students from public, anon;
grant select, insert, update, delete on table public.users, public.teachers, public.students to authenticated;
grant all on table public.users, public.teachers, public.students to service_role;

notify pgrst, 'reload schema';
