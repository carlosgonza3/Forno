-- Group manual existence additions into auditable transactions while
-- preserving the client's existing table-level inventory policies.

create table public.inventory_addition_transactions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  item_count integer not null check (item_count > 0),
  created_at timestamptz not null default now()
);

alter table public.inventory_addition_transactions enable row level security;

create policy "staff read inventory addition transactions"
on public.inventory_addition_transactions for select to authenticated
using (true);

grant select on table public.inventory_addition_transactions to authenticated;

alter table public.stock_movements
  add column quantity_before numeric(14,3),
  add column quantity_after numeric(14,3);

create index inventory_addition_transactions_created_idx
  on public.inventory_addition_transactions(created_at desc);

create index movements_source_created_idx
  on public.stock_movements(source_id, created_at);

-- Preserve previous manual additions as one-item legacy transactions.
insert into public.inventory_addition_transactions (id, created_by, item_count, created_at)
select movement.id, movement.created_by, 1, movement.created_at
from public.stock_movements as movement
where movement.movement_type = 'adjustment'
  and movement.note = 'Adición manual de existencia'
  and movement.source_id is null
on conflict (id) do nothing;

update public.stock_movements as movement
set source_id = movement.id
where movement.movement_type = 'adjustment'
  and movement.note = 'Adición manual de existencia'
  and movement.source_id is null;

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
  transaction_id uuid;
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

  insert into public.inventory_addition_transactions (created_by, item_count)
  values (actor_id, jsonb_array_length(additions))
  returning id into transaction_id;

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
      'Adición manual de existencia',
      transaction_id,
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
