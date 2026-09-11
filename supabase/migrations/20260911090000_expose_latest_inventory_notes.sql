-- Expose the latest note entered for each item during an existence update.
-- This is additive and reads the existing movement history without changing it.

create or replace function public.get_latest_inventory_notes()
returns table (
  inventory_type text,
  item_id uuid,
  note text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'ingredient'::text, latest.item_id, latest.note, latest.created_at
    from (
      select distinct on (movement.item_id)
        movement.item_id,
        movement.note,
        movement.created_at
      from public.stock_movements as movement
      where movement.movement_type = 'adjustment'
        and nullif(btrim(movement.note), '') is not null
      order by movement.item_id, movement.created_at desc, movement.id desc
    ) as latest
  union all
  select 'processed'::text, latest.item_id, latest.note, latest.created_at
    from (
      select distinct on (movement.item_id)
        movement.item_id,
        movement.note,
        movement.created_at
      from public.processed_stock_movements as movement
      where nullif(btrim(movement.note), '') is not null
      order by movement.item_id, movement.created_at desc, movement.id desc
    ) as latest;
$$;

revoke all on function public.get_latest_inventory_notes() from public, anon;
grant execute on function public.get_latest_inventory_notes() to authenticated;
