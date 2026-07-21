-- Create an application profile whenever Supabase Auth creates a user.
-- Roles are never accepted from user-controlled metadata; all new users start local.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Forno user'
    ),
    'local'::public.user_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Safely create profiles for Auth users added before this trigger existed.
insert into public.profiles (id, display_name, role)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Forno user'
  ),
  'local'::public.user_role
from auth.users as users
on conflict (id) do nothing;
