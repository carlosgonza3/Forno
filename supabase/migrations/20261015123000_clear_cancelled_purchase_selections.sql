-- Release cancelled-order items without carrying their previous inclusion
-- into the next purchase list. Existing orders, inventory, and history are
-- not rewritten; this changes only future cancellation behavior.

create or replace function public.cancel_purchase_list(target_list_id uuid)
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

  -- A cancelled order releases its items for future purchasing, but it must
  -- not silently select them for the next order. Clearing the old quantity
  -- override also ensures any future inclusion uses current inventory levels.
  insert into public.shopping_list_items (
    item_id,
    quantity_override,
    included,
    quantity_manually_overridden
  )
  select
    purchase_list_items.item_id,
    null,
    false,
    false
  from public.purchase_list_items
  where purchase_list_items.list_id = target_list_id
  on conflict (item_id) do update
  set quantity_override = excluded.quantity_override,
      included = excluded.included,
      quantity_manually_overridden = excluded.quantity_manually_overridden;

  return cancelled_item_count;
end;
$$;

revoke all on function public.cancel_purchase_list(uuid) from public, anon;
grant execute on function public.cancel_purchase_list(uuid) to authenticated;
