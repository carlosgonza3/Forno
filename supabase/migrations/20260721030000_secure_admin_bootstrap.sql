-- Securely bootstrap an Admin from a Supabase Auth user created in the Dashboard.
-- This function is intentionally unavailable to browser roles.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'::public.user_role
    );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function private.assign_admin_by_email(target_email text)
returns table (
  user_id uuid,
  display_name text,
  assigned_role public.user_role
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user auth.users%rowtype;
begin
  select users.*
  into target_user
  from auth.users as users
  where lower(users.email) = lower(trim(target_email))
  limit 1;

  if target_user.id is null then
    raise exception 'No Supabase Auth user exists for %', target_email
      using errcode = 'P0002';
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    target_user.id,
    coalesce(
      nullif(trim(target_user.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(target_user.email, ''), '@', 1), ''),
      'Forno Admin'
    ),
    'admin'::public.user_role
  )
  on conflict (id) do update
  set role = 'admin'::public.user_role,
      updated_at = now();

  insert into public.audit_log (actor_id, action, table_name, record_id, metadata)
  values (
    null,
    'bootstrap_admin',
    'profiles',
    target_user.id,
    jsonb_build_object('email', lower(target_user.email))
  );

  return query
  select profiles.id, profiles.display_name, profiles.role
  from public.profiles as profiles
  where profiles.id = target_user.id;
end;
$$;

revoke all on function private.assign_admin_by_email(text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.assign_admin_by_email(text) to service_role;

comment on function private.assign_admin_by_email(text) is
  'Server-only bootstrap helper. Create the Auth user first, then run this from the Supabase SQL Editor.';
