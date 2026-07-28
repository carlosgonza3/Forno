-- Save purchase lists as immutable item snapshots and receive each pending
-- list exactly once into inventory. Existing inventory policies stay intact.

create table public.purchase_lists (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'received')),
  item_count integer not null check (item_count > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  received_by uuid references auth.users(id),
  received_at timestamptz,
  check (
    (status = 'pending' and received_by is null and received_at is null)
    or (status = 'received' and received_by is not null and received_at is not null)
  )
);

create table public.purchase_list_items (
  list_id uuid not null references public.purchase_lists(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id),
  item_name text not null,
  supplier_name text not null,
  base_unit text not null,
  quantity_ordered numeric(14,3) not null check (quantity_ordered > 0),
  pending boolean not null default true,
  primary key (list_id, item_id)
);

create unique index one_pending_purchase_per_item_idx
  on public.purchase_list_items(item_id)
  where pending;

create index purchase_lists_created_idx
  on public.purchase_lists(created_at desc);

alter table public.purchase_lists enable row level security;
alter table public.purchase_list_items enable row level security;

create policy "staff read purchase lists"
on public.purchase_lists for select to authenticated
using (true);

create policy "staff read purchase list items"
on public.purchase_list_items for select to authenticated
using (true);

grant select on table public.purchase_lists, public.purchase_list_items to authenticated;

create function public.create_purchase_list(order_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  list_id uuid;
  order_item jsonb;
  target_item_id uuid;
  ordered_quantity numeric(14,3);
  target record;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  if order_items is null
     or jsonb_typeof(order_items) <> 'array'
     or jsonb_array_length(order_items) = 0
     or jsonb_array_length(order_items) > 500 then
    raise exception using errcode = '22023', message = 'Purchase lists require between 1 and 500 items';
  end if;

  insert into public.purchase_lists (item_count, created_by)
  values (jsonb_array_length(order_items), actor_id)
  returning id into list_id;

  for order_item in select value from jsonb_array_elements(order_items)
  loop
    begin
      target_item_id := (order_item->>'item_id')::uuid;
      ordered_quantity := (order_item->>'quantity')::numeric(14,3);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'Invalid purchase-list item';
    end;

    if target_item_id is null or ordered_quantity is null or ordered_quantity <= 0 then
      raise exception using errcode = '22023', message = 'Ordered quantities must be greater than zero';
    end if;

    select
      inventory_items.id,
      inventory_items.name,
      inventory_items.base_unit,
      coalesce(suppliers.name, 'Sin proveedor') as supplier_name
    into target
    from public.inventory_items
    left join public.suppliers on suppliers.id = inventory_items.supplier_id
    where inventory_items.id = target_item_id
      and inventory_items.active;

    if not found then
      raise exception using errcode = 'P0002', message = 'Inventory item not found or inactive';
    end if;

    insert into public.purchase_list_items (
      list_id,
      item_id,
      item_name,
      supplier_name,
      base_unit,
      quantity_ordered
    ) values (
      list_id,
      target.id,
      target.name,
      target.supplier_name,
      target.base_unit,
      ordered_quantity
    );
  end loop;

  return list_id;
end;
$$;

create function public.receive_purchase_list(target_list_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_list record;
  ordered_item record;
  quantity_before numeric(14,3);
  transaction_id uuid;
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

  insert into public.inventory_addition_transactions (created_by, item_count)
  values (actor_id, target_list.item_count)
  returning id into transaction_id;

  for ordered_item in
    select purchase_list_items.item_id, purchase_list_items.quantity_ordered
    from public.purchase_list_items
    where purchase_list_items.list_id = target_list_id
      and purchase_list_items.pending
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
    set quantity = quantity_before + ordered_item.quantity_ordered,
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
      ordered_item.quantity_ordered,
      quantity_before,
      quantity_before + ordered_item.quantity_ordered,
      'Recepción de lista de compras',
      transaction_id,
      actor_id
    );
  end loop;

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

revoke all on function public.create_purchase_list(jsonb) from public, anon;
revoke all on function public.receive_purchase_list(uuid) from public, anon;
grant execute on function public.create_purchase_list(jsonb) to authenticated;
grant execute on function public.receive_purchase_list(uuid) to authenticated;
