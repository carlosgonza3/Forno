-- Normalize every inventory item to the permanent FOR-000001 SKU format.
-- This is a controlled one-time rewrite before the inventory MVP is released.

drop trigger if exists enforce_inventory_sku on public.inventory_items;

do $$
begin
  if (select count(*) from public.inventory_items) > 999999 then
    raise exception 'Cannot normalize more than 999999 inventory SKUs into the FOR-000001 format.';
  end if;
end;
$$;

-- Move every current value out of the final namespace before assigning numbers.
-- UUID-backed temporary values keep the unique constraint satisfied throughout.
update public.inventory_items
set sku = 'MIG-' || id::text;

with numbered_items as (
  select
    id,
    row_number() over (
      order by created_at, lower(name), id
    ) as sku_number
  from public.inventory_items
)
update public.inventory_items as item
set sku = 'FOR-' || lpad(numbered_items.sku_number::text, 6, '0')
from numbered_items
where item.id = numbered_items.id;

do $$
begin
  if exists (
    select 1
    from public.inventory_items
    where sku !~ '^FOR-[0-9]{6}$'
  ) then
    raise exception 'Inventory SKU normalization did not complete successfully.';
  end if;
end;
$$;

select setval(
  'private.inventory_sku_sequence'::regclass,
  greatest((select count(*) from public.inventory_items), 1),
  exists(select 1 from public.inventory_items)
);

create trigger enforce_inventory_sku
  before insert or update of sku on public.inventory_items
  for each row execute function private.enforce_inventory_sku();

comment on column public.inventory_items.sku is
  'Immutable system identifier in FOR-000001 format, generated and maintained by PostgreSQL.';
