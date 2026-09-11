-- Safely manage inventory departments without rewriting existing catalog data.
-- Normalized uniqueness prevents names that differ only by case or whitespace.

create unique index departments_normalized_name_key
  on public.departments (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  );

create or replace function public.get_department_settings()
returns table (
  id uuid,
  name text,
  sort_order smallint,
  item_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select department.id,
         department.name,
         department.sort_order,
         count(item.id) as item_count
    from public.departments as department
    left join public.inventory_items as item
      on item.department_id = department.id
   group by department.id, department.name, department.sort_order
   order by department.sort_order, department.name;
$$;

create or replace function public.create_inventory_department(department_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  next_sort_order smallint;
  created_id uuid;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required';
  end if;

  normalized_name := regexp_replace(btrim(coalesce(department_name, '')), '\s+', ' ', 'g');
  if char_length(normalized_name) < 1 or char_length(normalized_name) > 80 then
    raise exception using errcode = '22023', message = 'Department names must contain between 1 and 80 characters';
  end if;

  select least(coalesce(max(department.sort_order), 0) + 10, 32767)::smallint
    into next_sort_order
    from public.departments as department;

  insert into public.departments (name, sort_order)
  values (normalized_name, next_sort_order)
  returning departments.id into created_id;

  return created_id;
end;
$$;

create or replace function public.delete_inventory_department(
  target_department_id uuid,
  unassign_items boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_count bigint;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required';
  end if;

  perform 1 from public.departments where departments.id = target_department_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Department not found';
  end if;

  select count(*) into assigned_count
    from public.inventory_items
   where inventory_items.department_id = target_department_id;

  if assigned_count > 0 and not coalesce(unassign_items, false) then
    raise exception using errcode = '23503', message = 'Department still has assigned inventory items';
  end if;

  if assigned_count > 0 then
    update public.inventory_items
       set department_id = null,
           updated_at = now()
     where inventory_items.department_id = target_department_id;
  end if;

  delete from public.departments where departments.id = target_department_id;
  return assigned_count;
end;
$$;

revoke all on function public.get_department_settings() from public, anon;
revoke all on function public.create_inventory_department(text) from public, anon;
revoke all on function public.delete_inventory_department(uuid, boolean) from public, anon;

grant execute on function public.get_department_settings() to authenticated;
grant execute on function public.create_inventory_department(text) to authenticated;
grant execute on function public.delete_inventory_department(uuid, boolean) to authenticated;
