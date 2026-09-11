-- Preserve cancelled orders in purchase history while releasing their items
-- from the pending-order constraint. Inventory quantities are never changed.

alter table public.purchase_lists
  add column cancelled_by uuid references auth.users(id),
  add column cancelled_at timestamptz;

alter table public.purchase_lists
  drop constraint purchase_lists_status_check,
  drop constraint purchase_lists_check;

alter table public.purchase_lists
  add constraint purchase_lists_status_check
    check (status in ('pending', 'received', 'cancelled')),
  add constraint purchase_lists_lifecycle_check check (
    (status = 'pending'
      and received_by is null and received_at is null
      and cancelled_by is null and cancelled_at is null)
    or (status = 'received'
      and received_by is not null and received_at is not null
      and cancelled_by is null and cancelled_at is null)
    or (status = 'cancelled'
      and received_by is null and received_at is null
      and cancelled_by is not null and cancelled_at is not null)
  );

create function public.cancel_purchase_list(target_list_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  cancelled_item_count bigint;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  perform 1
    from public.purchase_lists
   where purchase_lists.id = target_list_id
     and purchase_lists.status = 'pending'
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pending purchase list not found';
  end if;

  update public.purchase_list_items
     set pending = false
   where purchase_list_items.list_id = target_list_id
     and purchase_list_items.pending;

  get diagnostics cancelled_item_count = row_count;

  update public.purchase_lists
     set status = 'cancelled',
         cancelled_by = actor_id,
         cancelled_at = now()
   where purchase_lists.id = target_list_id;

  return cancelled_item_count;
end;
$$;

revoke all on function public.cancel_purchase_list(uuid) from public, anon;
grant execute on function public.cancel_purchase_list(uuid) to authenticated;
