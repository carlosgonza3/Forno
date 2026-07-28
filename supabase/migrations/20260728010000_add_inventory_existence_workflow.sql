-- Atomic inventory additions with an auditable stock movement for every item.

create or replace function public.add_inventory_existences(additions jsonb)
returns table (
  item_id uuid,
  previous_quantity numeric,
  added_quantity numeric,
  new_quantity numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  addition jsonb;
  target public.inventory_items%rowtype;
  amount numeric(14,3);
begin
  if additions is null or jsonb_typeof(additions) <> 'array' or jsonb_array_length(additions) = 0 then
    raise exception 'At least one inventory addition is required';
  end if;

  for addition in select value from jsonb_array_elements(additions)
  loop
    amount := (addition->>'quantity')::numeric;
    if amount is null or amount <= 0 then
      raise exception 'Inventory additions must be greater than zero';
    end if;

    select * into target
    from public.inventory_items
    where id = (addition->>'item_id')::uuid and active
    for update;

    if not found then
      raise exception 'Inventory item not found or inactive';
    end if;

    update public.inventory_items
    set quantity = quantity + amount,
        updated_at = now()
    where id = target.id;

    insert into public.stock_movements (
      item_id, movement_type, quantity_delta, note, created_by
    ) values (
      target.id, 'adjustment', amount, 'Adición manual de existencia', auth.uid()
    );

    item_id := target.id;
    previous_quantity := target.quantity;
    added_quantity := amount;
    new_quantity := target.quantity + amount;
    return next;
  end loop;
end;
$$;

grant execute on function public.add_inventory_existences(jsonb) to authenticated;

-- Inventory activity is visible to the authenticated team, including who recorded it.
create policy "staff read profile identities"
on public.profiles for select to authenticated
using (true);
