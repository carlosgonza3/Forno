-- Let authenticated users enter the counted stock level directly. The
-- resulting signed movement is still calculated and stored for the audit log.

create or replace function public.set_inventory_existences(updates jsonb)
returns table (
  item_id uuid,
  previous_quantity numeric,
  quantity_delta numeric,
  new_quantity numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inventory_update jsonb;
  target_item_id uuid;
  transaction_id uuid;
  actor_id uuid;
  target_quantity numeric(14,3);
  quantity_before numeric(14,3);
  amount numeric(14,3);
  movement_note text;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to update inventory';
  end if;

  if updates is null
     or jsonb_typeof(updates) <> 'array'
     or jsonb_array_length(updates) = 0
     or jsonb_array_length(updates) > 500 then
    raise exception using
      errcode = '22023',
      message = 'Inventory updates must contain between 1 and 500 entries';
  end if;

  insert into public.inventory_addition_transactions (created_by, item_count)
  values (actor_id, jsonb_array_length(updates))
  returning id into transaction_id;

  for inventory_update in select value from jsonb_array_elements(updates)
  loop
    begin
      target_item_id := (inventory_update->>'item_id')::uuid;
      target_quantity := (inventory_update->>'new_quantity')::numeric(14,3);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using
          errcode = '22023',
          message = 'Each inventory update requires a valid item and quantity';
    end;

    movement_note := nullif(btrim(coalesce(inventory_update->>'note', '')), '');

    if target_item_id is null or target_quantity is null or target_quantity < 0 then
      raise exception using
        errcode = '22023',
        message = 'Inventory quantities must be zero or greater';
    end if;

    if movement_note is not null and char_length(movement_note) > 500 then
      raise exception using
        errcode = '22023',
        message = 'Inventory update notes cannot exceed 500 characters';
    end if;

    select inventory_items.quantity
      into quantity_before
      from public.inventory_items
     where inventory_items.id = target_item_id
       and inventory_items.active
     for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Inventory item not found or inactive';
    end if;

    amount := target_quantity - quantity_before;
    if amount = 0 then
      raise exception using
        errcode = '22023',
        message = 'Inventory updates must change the current quantity';
    end if;

    update public.inventory_items
       set quantity = target_quantity,
           updated_at = now()
     where inventory_items.id = target_item_id;

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
      target_item_id,
      'adjustment',
      amount,
      quantity_before,
      target_quantity,
      movement_note,
      transaction_id,
      actor_id
    );

    item_id := target_item_id;
    previous_quantity := quantity_before;
    quantity_delta := amount;
    new_quantity := target_quantity;
    return next;
  end loop;
end;
$$;

revoke all on function public.set_inventory_existences(jsonb) from public, anon;
grant execute on function public.set_inventory_existences(jsonb) to authenticated;
