-- Persist the team's shared purchase-list decisions without changing the
-- client's existing inventory tables or policies.

create table public.shopping_list_items (
  item_id uuid primary key references public.inventory_items(id) on delete cascade,
  quantity_override numeric(14,3) check (quantity_override >= 0),
  included boolean not null default true,
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.shopping_list_items enable row level security;

create function public.set_shopping_list_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_shopping_list_audit
before insert or update on public.shopping_list_items
for each row execute function public.set_shopping_list_audit();

create policy "staff read shopping list"
on public.shopping_list_items for select to authenticated
using (true);

create policy "staff add shopping list items"
on public.shopping_list_items for insert to authenticated
with check (updated_by = auth.uid());

create policy "staff update shopping list items"
on public.shopping_list_items for update to authenticated
using (true)
with check (updated_by = auth.uid());

create policy "staff remove shopping list items"
on public.shopping_list_items for delete to authenticated
using (true);

grant select, insert, update, delete
on table public.shopping_list_items
to authenticated;

create index shopping_list_items_updated_idx
  on public.shopping_list_items(updated_at desc);
