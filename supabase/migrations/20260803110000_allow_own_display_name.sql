-- Users may update their own display name without receiving permission to
-- modify protected profile fields such as their role.

create or replace function public.update_own_display_name(new_display_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_name text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  normalized_name := regexp_replace(btrim(coalesce(new_display_name, '')), '\s+', ' ', 'g');
  if char_length(normalized_name) < 1 or char_length(normalized_name) > 80 then
    raise exception using errcode = '22023', message = 'Display name must contain between 1 and 80 characters';
  end if;

  update public.profiles
     set display_name = normalized_name,
         updated_at = now()
   where id = actor_id
   returning display_name into normalized_name;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;

  return normalized_name;
end;
$$;

revoke all on function public.update_own_display_name(text) from public, anon;
grant execute on function public.update_own_display_name(text) to authenticated;
