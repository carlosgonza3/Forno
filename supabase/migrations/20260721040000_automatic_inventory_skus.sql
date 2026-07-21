-- Assign stable inventory SKUs in PostgreSQL and prevent accidental changes.
-- Existing imported identifiers remain intact until the normalization migration.

create sequence if not exists private.inventory_sku_sequence as bigint start with 1;

create or replace function private.next_inventory_sku()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := 'FOR-' || lpad(nextval('private.inventory_sku_sequence'::regclass)::text, 6, '0');
    exit when not exists (
      select 1 from public.inventory_items where sku = candidate
    );
  end loop;
  return candidate;
end;
$$;

revoke all on function private.next_inventory_sku() from public, anon, authenticated;

update public.inventory_items
set sku = private.next_inventory_sku()
where sku is null or btrim(sku) = '';

alter table public.inventory_items alter column sku set not null;

create or replace function private.enforce_inventory_sku()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Every insertion path receives a server-generated identifier.
    new.sku := private.next_inventory_sku();
  elsif new.sku is distinct from old.sku then
    raise exception 'Inventory SKU is immutable after creation.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_inventory_sku() from public, anon, authenticated;

drop trigger if exists enforce_inventory_sku on public.inventory_items;
create trigger enforce_inventory_sku
  before insert or update of sku on public.inventory_items
  for each row execute function private.enforce_inventory_sku();

comment on column public.inventory_items.sku is
  'Immutable system identifier. New values are generated automatically in FOR-000001 format.';
