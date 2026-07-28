-- Record what was actually received for each ordered item and add only those
-- quantities to inventory. Existing purchase history remains compatible.

alter table public.purchase_list_items
  add column quantity_received numeric(14,3)
  check (quantity_received >= 0);

-- Lists received before this review flow always added the full ordered amount.
update public.purchase_list_items
set quantity_received = quantity_ordered
where not pending;

create function public.receive_purchase_list(
  target_list_id uuid,
  received_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_list record;
  ordered_item record;
  receipt_item jsonb;
  received_quantity numeric(14,3);
  quantity_before numeric(14,3);
  transaction_id uuid;
  received_count integer;
  matching_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  select purchase_lists.id, purchase_lists.item_count
  into target_list
  from public.purchase_lists
  where purchase_lists.id = target_list_id
    and purchase_lists.status = 'pending'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pending purchase list not found';
  end if;

  if received_items is null
     or jsonb_typeof(received_items) <> 'array'
     or jsonb_array_length(received_items) <> target_list.item_count then
    raise exception using errcode = '22023', message = 'Every ordered item requires a received quantity';
  end if;

  for ordered_item in
    select purchase_list_items.item_id
    from public.purchase_list_items
    where purchase_list_items.list_id = target_list_id
      and purchase_list_items.pending
    order by purchase_list_items.item_id
  loop
    select count(*)
    into matching_count
    from jsonb_array_elements(received_items)
    where value->>'item_id' = ordered_item.item_id::text;

    if matching_count <> 1 then
      raise exception using errcode = '22023', message = 'Each ordered item must appear exactly once';
    end if;

    select value
    into receipt_item
    from jsonb_array_elements(received_items)
    where value->>'item_id' = ordered_item.item_id::text
    limit 1;

    begin
      received_quantity := (receipt_item->>'quantity_received')::numeric(14,3);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'Invalid received quantity';
    end;

    if received_quantity is null or received_quantity < 0 then
      raise exception using errcode = '22023', message = 'Received quantities must be zero or greater';
    end if;

    update public.purchase_list_items
    set quantity_received = received_quantity
    where purchase_list_items.list_id = target_list_id
      and purchase_list_items.item_id = ordered_item.item_id;
  end loop;

  select count(*)
  into received_count
  from public.purchase_list_items
  where purchase_list_items.list_id = target_list_id
    and purchase_list_items.quantity_received > 0;

  if received_count > 0 then
    insert into public.inventory_addition_transactions (created_by, item_count)
    values (actor_id, received_count)
    returning id into transaction_id;

    for ordered_item in
      select
        purchase_list_items.item_id,
        purchase_list_items.quantity_received
      from public.purchase_list_items
      where purchase_list_items.list_id = target_list_id
        and purchase_list_items.quantity_received > 0
      order by purchase_list_items.item_id
    loop
      select inventory_items.quantity
      into quantity_before
      from public.inventory_items
      where inventory_items.id = ordered_item.item_id
      for update;

      if not found then
        raise exception using errcode = 'P0002', message = 'Inventory item no longer exists';
      end if;

      update public.inventory_items
      set quantity = quantity_before + ordered_item.quantity_received,
          updated_at = now()
      where inventory_items.id = ordered_item.item_id;

      insert into public.stock_movements (
        item_id,
        movement_type,
        quantity_delta,
        quantity_before,
        quantity_after,
        note,
        source_id,
        created_by
      ) values (
        ordered_item.item_id,
        'purchase',
        ordered_item.quantity_received,
        quantity_before,
        quantity_before + ordered_item.quantity_received,
        'Recepción de lista de compras',
        transaction_id,
        actor_id
      );
    end loop;
  end if;

  update public.purchase_list_items
  set pending = false
  where purchase_list_items.list_id = target_list_id;

  update public.purchase_lists
  set status = 'received',
      received_by = actor_id,
      received_at = now()
  where purchase_lists.id = target_list_id;

  delete from public.shopping_list_items
  where shopping_list_items.item_id in (
    select purchase_list_items.item_id
    from public.purchase_list_items
    where purchase_list_items.list_id = target_list_id
  );

  return transaction_id;
end;
$$;

revoke all on function public.receive_purchase_list(uuid, jsonb) from public, anon;
grant execute on function public.receive_purchase_list(uuid, jsonb) to authenticated;

-- The reviewed two-argument function is now the only receipt path available
-- to application users.
revoke execute on function public.receive_purchase_list(uuid) from authenticated;
