-- Persist user-facing operational notifications. Inventory existence updates are
-- represented by their parent transaction, never by individual stock movements.

create table public.activity_notifications (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'ingredients_updated',
    'processed_updated',
    'ingredient_created',
    'ingredient_updated',
    'processed_item_created',
    'processed_item_updated',
    'supplier_created',
    'supplier_updated',
    'display_name_changed',
    'purchase_created',
    'purchase_status_changed'
  )),
  entity_type text not null,
  entity_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Usuario',
  item_count integer check (item_count is null or item_count > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_notifications_created_idx
  on public.activity_notifications(created_at desc, id desc);

alter table public.activity_notifications enable row level security;

create policy "staff read activity notifications"
on public.activity_notifications for select to authenticated
using (true);

grant select on public.activity_notifications to authenticated;

create or replace function public.record_activity_notification(
  activity_type text,
  target_type text,
  target_id uuid,
  activity_actor uuid,
  activity_count integer default null,
  activity_metadata jsonb default '{}'::jsonb,
  activity_created_at timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id bigint;
  resolved_actor_name text;
begin
  select profiles.display_name
    into resolved_actor_name
    from public.profiles
   where profiles.id = activity_actor;

  insert into public.activity_notifications (
    event_type,
    entity_type,
    entity_id,
    actor_id,
    actor_name,
    item_count,
    metadata,
    created_at
  ) values (
    activity_type,
    target_type,
    target_id,
    activity_actor,
    coalesce(resolved_actor_name, 'Usuario'),
    activity_count,
    coalesce(activity_metadata, '{}'::jsonb),
    activity_created_at
  ) returning id into notification_id;

  return notification_id;
end;
$$;

revoke all on function public.record_activity_notification(
  text, text, uuid, uuid, integer, jsonb, timestamptz
) from public, anon, authenticated;

-- Prepared-stock movements now have the same parent transaction model used by
-- regular inventory movements.
create table public.processed_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  item_count integer not null check (item_count > 0),
  created_at timestamptz not null default now()
);

alter table public.processed_inventory_transactions enable row level security;

create policy "staff read processed inventory transactions"
on public.processed_inventory_transactions for select to authenticated
using (true);

grant select on public.processed_inventory_transactions to authenticated;

alter table public.processed_stock_movements
  add column source_id uuid references public.processed_inventory_transactions(id);

with grouped_movements as (
  select gen_random_uuid() as id, created_by, created_at, count(*)::integer as item_count
    from public.processed_stock_movements
   group by created_by, created_at
), inserted_transactions as (
  insert into public.processed_inventory_transactions (id, created_by, item_count, created_at)
  select id, created_by, item_count, created_at from grouped_movements
  returning id, created_by, created_at
)
update public.processed_stock_movements as movement
   set source_id = transaction.id
  from inserted_transactions as transaction
 where movement.created_by = transaction.created_by
   and movement.created_at = transaction.created_at;

alter table public.processed_stock_movements
  alter column source_id set not null;

create index processed_stock_movements_source_idx
  on public.processed_stock_movements(source_id);

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
  transaction_id uuid;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if updates is null or jsonb_typeof(updates) <> 'array'
     or jsonb_array_length(updates) = 0 or jsonb_array_length(updates) > 500 then
    raise exception using errcode = '22023', message = 'Updates must contain between 1 and 500 entries';
  end if;

  insert into public.processed_inventory_transactions (created_by, item_count)
  values (actor_id, jsonb_array_length(updates))
  returning id into transaction_id;

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
      (item_id, quantity_delta, quantity_before, quantity_after, note, source_id, created_by)
      values (target_item_id, amount, quantity_before, target_quantity, movement_note,
        transaction_id, actor_id);

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

create or replace function public.notify_inventory_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_activity_notification(
    case when tg_table_name = 'processed_inventory_transactions'
      then 'processed_updated' else 'ingredients_updated' end,
    tg_table_name,
    new.id,
    new.created_by,
    new.item_count,
    '{}'::jsonb,
    new.created_at
  );
  return new;
end;
$$;

create trigger notify_regular_inventory_transaction
after insert on public.inventory_addition_transactions
for each row execute function public.notify_inventory_transaction();

create trigger notify_processed_inventory_transaction
after insert on public.processed_inventory_transactions
for each row execute function public.notify_inventory_transaction();

create or replace function public.notify_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_type text;
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(old) - array['quantity', 'updated_at'])
       is not distinct from (to_jsonb(new) - array['quantity', 'updated_at']) then
    return new;
  end if;

  activity_type := case
    when tg_table_name = 'inventory_items' and tg_op = 'INSERT' then 'ingredient_created'
    when tg_table_name = 'inventory_items' then 'ingredient_updated'
    when tg_op = 'INSERT' then 'processed_item_created'
    else 'processed_item_updated'
  end;

  perform public.record_activity_notification(
    activity_type,
    tg_table_name,
    new.id,
    auth.uid(),
    null,
    jsonb_build_object('name', new.name),
    now()
  );
  return new;
end;
$$;

create trigger notify_ingredient_catalog_change
after insert or update on public.inventory_items
for each row execute function public.notify_catalog_change();

create trigger notify_processed_catalog_change
after insert or update on public.processed_inventory_items
for each row execute function public.notify_catalog_change();

create or replace function public.notify_supplier_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_activity_notification(
    case when tg_op = 'INSERT' then 'supplier_created' else 'supplier_updated' end,
    'suppliers',
    new.id,
    auth.uid(),
    null,
    jsonb_build_object('name', new.name),
    now()
  );
  return new;
end;
$$;

create trigger notify_supplier_change
after insert or update on public.suppliers
for each row execute function public.notify_supplier_change();

create or replace function public.notify_display_name_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.display_name is distinct from new.display_name then
    perform public.record_activity_notification(
      'display_name_changed',
      'profiles',
      new.id,
      coalesce(auth.uid(), new.id),
      null,
      jsonb_build_object('display_name', new.display_name),
      now()
    );
  end if;
  return new;
end;
$$;

create trigger notify_display_name_change
after update of display_name on public.profiles
for each row execute function public.notify_display_name_change();

create or replace function public.notify_purchase_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_activity_notification(
      'purchase_created',
      'purchase_lists',
      new.id,
      new.created_by,
      new.item_count,
      jsonb_build_object('status', new.status),
      new.created_at
    );
  elsif old.status is distinct from new.status then
    perform public.record_activity_notification(
      'purchase_status_changed',
      'purchase_lists',
      new.id,
      coalesce(new.received_by, auth.uid(), new.created_by),
      new.item_count,
      jsonb_build_object('previous_status', old.status, 'status', new.status),
      coalesce(new.received_at, now())
    );
  end if;
  return new;
end;
$$;

create trigger notify_purchase_change
after insert or update of status on public.purchase_lists
for each row execute function public.notify_purchase_change();

-- Seed the new feed from grouped operational history. Catalog/profile edits did
-- not previously retain enough information to reconstruct reliable events.
insert into public.activity_notifications (
  event_type, entity_type, entity_id, actor_id, actor_name, item_count, metadata, created_at
)
select 'ingredients_updated', 'inventory_addition_transactions', transaction.id,
  transaction.created_by, coalesce(profile.display_name, 'Usuario'), transaction.item_count,
  '{}'::jsonb, transaction.created_at
from public.inventory_addition_transactions as transaction
left join public.profiles as profile on profile.id = transaction.created_by;

insert into public.activity_notifications (
  event_type, entity_type, entity_id, actor_id, actor_name, item_count, metadata, created_at
)
select 'processed_updated', 'processed_inventory_transactions', transaction.id,
  transaction.created_by, coalesce(profile.display_name, 'Usuario'), transaction.item_count,
  '{}'::jsonb, transaction.created_at
from public.processed_inventory_transactions as transaction
left join public.profiles as profile on profile.id = transaction.created_by;

insert into public.activity_notifications (
  event_type, entity_type, entity_id, actor_id, actor_name, item_count, metadata, created_at
)
select 'purchase_created', 'purchase_lists', purchase.id,
  purchase.created_by, coalesce(profile.display_name, 'Usuario'), purchase.item_count,
  jsonb_build_object('status', 'pending'), purchase.created_at
from public.purchase_lists as purchase
left join public.profiles as profile on profile.id = purchase.created_by;

insert into public.activity_notifications (
  event_type, entity_type, entity_id, actor_id, actor_name, item_count, metadata, created_at
)
select 'purchase_status_changed', 'purchase_lists', purchase.id,
  purchase.received_by, coalesce(profile.display_name, 'Usuario'), purchase.item_count,
  jsonb_build_object('previous_status', 'pending', 'status', 'received'), purchase.received_at
from public.purchase_lists as purchase
left join public.profiles as profile on profile.id = purchase.received_by
where purchase.status = 'received' and purchase.received_at is not null;

revoke all on function public.notify_inventory_transaction() from public, anon, authenticated;
revoke all on function public.notify_catalog_change() from public, anon, authenticated;
revoke all on function public.notify_supplier_change() from public, anon, authenticated;
revoke all on function public.notify_display_name_change() from public, anon, authenticated;
revoke all on function public.notify_purchase_change() from public, anon, authenticated;
