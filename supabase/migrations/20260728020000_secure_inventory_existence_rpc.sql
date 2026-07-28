-- Preserve the client's admin-only direct UPDATE policy while allowing all
-- authenticated staff to use this single constrained inventory workflow.

create or replace function public.add_inventory_existences(additions jsonb)
returns table (
  item_id uuid,
  previous_quantity numeric,
  added_quantity numeric,
  new_quantity numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  addition jsonb;
  target_item_id uuid;
  actor_id uuid;
  amount numeric(14,3);
  quantity_before numeric(14,3);
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to add inventory existence';
  end if;

  if additions is null
     or jsonb_typeof(additions) <> 'array'
     or jsonb_array_length(additions) = 0
     or jsonb_array_length(additions) > 500 then
    raise exception using
      errcode = '22023',
      message = 'Inventory additions must contain between 1 and 500 entries';
  end if;

  for addition in select value from jsonb_array_elements(additions)
  loop
    begin
      target_item_id := (addition->>'item_id')::uuid;
      amount := (addition->>'quantity')::numeric(14,3);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using
          errcode = '22023',
          message = 'Each inventory addition requires a valid item and quantity';
    end;

    if target_item_id is null or amount is null or amount <= 0 then
      raise exception using
        errcode = '22023',
        message = 'Inventory additions must be greater than zero';
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

    update public.inventory_items
       set quantity = quantity_before + amount,
           updated_at = now()
     where inventory_items.id = target_item_id;

    insert into public.stock_movements (
      item_id,
      movement_type,
      quantity_delta,
      note,
      created_by
    ) values (
      target_item_id,
      'adjustment',
      amount,
      'Adición manual de existencia',
      actor_id
    );

    item_id := target_item_id;
    previous_quantity := quantity_before;
    added_quantity := amount;
    new_quantity := quantity_before + amount;
    return next;
  end loop;
end;
$$;

revoke all on function public.add_inventory_existences(jsonb) from public, anon;
grant execute on function public.add_inventory_existences(jsonb) to authenticated;
