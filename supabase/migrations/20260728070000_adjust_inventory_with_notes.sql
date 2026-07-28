-- Allow every authenticated user to record signed inventory adjustments with
-- an optional per-item note. Existing addition history and client-owned data
-- remain unchanged.

create or replace function public.adjust_inventory_existences(adjustments jsonb)
returns table (
  item_id uuid,
  previous_quantity numeric,
  adjusted_quantity numeric,
  new_quantity numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  adjustment jsonb;
  target_item_id uuid;
  transaction_id uuid;
  actor_id uuid;
  amount numeric(14,3);
  quantity_before numeric(14,3);
  movement_note text;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to adjust inventory';
  end if;

  if adjustments is null
     or jsonb_typeof(adjustments) <> 'array'
     or jsonb_array_length(adjustments) = 0
     or jsonb_array_length(adjustments) > 500 then
    raise exception using
      errcode = '22023',
      message = 'Inventory adjustments must contain between 1 and 500 entries';
  end if;

  insert into public.inventory_addition_transactions (created_by, item_count)
  values (actor_id, jsonb_array_length(adjustments))
  returning id into transaction_id;

  for adjustment in select value from jsonb_array_elements(adjustments)
  loop
    begin
      target_item_id := (adjustment->>'item_id')::uuid;
      amount := (adjustment->>'quantity_delta')::numeric(14,3);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using
          errcode = '22023',
          message = 'Each inventory adjustment requires a valid item and quantity';
    end;

    movement_note := nullif(btrim(coalesce(adjustment->>'note', '')), '');

    if target_item_id is null or amount is null or amount = 0 then
      raise exception using
        errcode = '22023',
        message = 'Inventory adjustments cannot be zero';
    end if;

    if movement_note is not null and char_length(movement_note) > 500 then
      raise exception using
        errcode = '22023',
        message = 'Inventory adjustment notes cannot exceed 500 characters';
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

    if quantity_before + amount < 0 then
      raise exception using
        errcode = '23514',
        message = 'Inventory quantity cannot be below zero';
    end if;

    update public.inventory_items
       set quantity = quantity_before + amount,
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
      quantity_before + amount,
      movement_note,
      transaction_id,
      actor_id
    );

    item_id := target_item_id;
    previous_quantity := quantity_before;
    adjusted_quantity := amount;
    new_quantity := quantity_before + amount;
    return next;
  end loop;
end;
$$;

revoke all on function public.adjust_inventory_existences(jsonb) from public, anon;
grant execute on function public.adjust_inventory_existences(jsonb) to authenticated;
