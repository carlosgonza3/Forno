-- Prepared ingredients are inventory outputs, not purchasable catalog inputs.
-- Keeping them in dedicated tables prevents them from entering shopping suggestions.

create table public.processed_inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sku text not null unique default ('PROC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  base_unit text not null,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  par_level numeric(14,3) not null default 0 check (par_level >= 0),
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.processed_stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.processed_inventory_items(id),
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  quantity_before numeric(14,3) not null check (quantity_before >= 0),
  quantity_after numeric(14,3) not null check (quantity_after >= 0),
  note text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.processed_inventory_items enable row level security;
alter table public.processed_stock_movements enable row level security;

create policy "staff read processed inventory" on public.processed_inventory_items
  for select to authenticated using (true);
create policy "staff update processed inventory" on public.processed_inventory_items
  for update to authenticated using (true) with check (true);
create policy "admins create processed inventory" on public.processed_inventory_items
  for insert to authenticated with check (public.is_admin());
create policy "admins delete processed inventory" on public.processed_inventory_items
  for delete to authenticated using (public.is_admin());
create policy "staff read processed movements" on public.processed_stock_movements
  for select to authenticated using (true);

grant select, insert, update, delete on public.processed_inventory_items to authenticated;
grant select on public.processed_stock_movements to authenticated;

create index processed_inventory_items_name_idx on public.processed_inventory_items(name);
create index processed_stock_movements_item_created_idx
  on public.processed_stock_movements(item_id, created_at desc);

create or replace function public.set_processed_inventory_existences(updates jsonb)
returns table (item_id uuid, previous_quantity numeric, quantity_delta numeric, new_quantity numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inventory_update jsonb;
  target_item_id uuid;
  target_quantity numeric(14,3);
  quantity_before numeric(14,3);
  amount numeric(14,3);
  movement_note text;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if updates is null or jsonb_typeof(updates) <> 'array'
     or jsonb_array_length(updates) = 0 or jsonb_array_length(updates) > 500 then
    raise exception using errcode = '22023', message = 'Updates must contain between 1 and 500 entries';
  end if;

  for inventory_update in select value from jsonb_array_elements(updates)
  loop
    begin
      target_item_id := (inventory_update->>'item_id')::uuid;
      target_quantity := (inventory_update->>'new_quantity')::numeric(14,3);
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'Each update requires a valid item and quantity';
    end;
    movement_note := nullif(btrim(coalesce(inventory_update->>'note', '')), '');
    if target_item_id is null or target_quantity is null or target_quantity < 0
       or (movement_note is not null and char_length(movement_note) > 500) then
      raise exception using errcode = '22023', message = 'Invalid processed inventory update';
    end if;

    select quantity into quantity_before from public.processed_inventory_items
      where id = target_item_id and active for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Processed inventory item not found or inactive';
    end if;
    amount := target_quantity - quantity_before;
    if amount = 0 then
      raise exception using errcode = '22023', message = 'Updates must change the current quantity';
    end if;

    update public.processed_inventory_items set quantity = target_quantity, updated_at = now()
      where id = target_item_id;
    insert into public.processed_stock_movements
      (item_id, quantity_delta, quantity_before, quantity_after, note, created_by)
      values (target_item_id, amount, quantity_before, target_quantity, movement_note, actor_id);

    item_id := target_item_id;
    previous_quantity := quantity_before;
    quantity_delta := amount;
    new_quantity := target_quantity;
    return next;
  end loop;
end;
$$;

revoke all on function public.set_processed_inventory_existences(jsonb) from public, anon;
grant execute on function public.set_processed_inventory_existences(jsonb) to authenticated;

insert into public.processed_inventory_items (name, base_unit, quantity) values
  ('Ali Oli Trufa', 'g', 200),
  ('Pesto', 'g', 500),
  ('Salsa de pizza', 'l', 4.5),
  ('Stracciatella', 'l', 1.5),
  ('Tomates deshidratados', 'g', 200),
  ('Zuchinni', 'g', 0),
  ('Tomates enlatados para salsa', 'lata', 0),
  ('Morrones asados', 'g', 200),
  ('Peras caramelizadas', 'g', 100),
  ('Peras cortadas', 'unidad', 2),
  ('Piña dorada para pizza', 'g', 210),
  ('Pecanas para pizza o ensalada', 'g', 200),
  ('Mozarella procesada', 'g', 0),
  ('Salami', 'g', 520),
  ('Tocino procesado para pizza', 'g', 250),
  ('Prosciutto procesado', 'g', 195),
  ('Parmesano cortado', 'g', 53),
  ('Cebolla caramelizada', 'g', 100),
  ('Mantequilla de ajo', 'l', 1.5),
  ('Miel picante', 'g', 700),
  ('Vinagreta', 'g', 160),
  ('Reducción balsámica', 'g', 30)
on conflict (name) do nothing;

