-- Forno inventory — initial Supabase schema
-- Run in a new Supabase project, then create the first user through Auth.

create extension if not exists pgcrypto;

create schema if not exists private;

create type public.user_role as enum ('admin', 'local');
create type public.movement_type as enum ('purchase', 'usage', 'prep', 'waste', 'adjustment');
create type public.receipt_status as enum ('uploaded', 'processing', 'review', 'approved', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.user_role not null default 'local',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order smallint not null default 0
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  department_id uuid references public.departments(id),
  supplier_id uuid references public.suppliers(id),
  base_unit text not null,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  par_level numeric(14,3) not null default 0 check (par_level >= 0),
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  package_size numeric(14,3) check (package_size > 0),
  package_unit text,
  icon_key text check (
    icon_key is null
    or icon_key in (
      'produce', 'fruit', 'herbs', 'meat', 'seafood', 'dairy', 'eggs',
      'grains', 'berries', 'prepared', 'bakery', 'beverages', 'wine', 'packaged'
    )
  ),
  icon_emoji text check (icon_emoji is null or char_length(icon_emoji) between 1 and 32),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id),
  movement_type public.movement_type not null,
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  unit_cost numeric(14,4),
  note text,
  source_id uuid,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  yield_quantity numeric(14,3) not null default 1 check (yield_quantity > 0),
  yield_unit text not null default 'porciones',
  selling_price numeric(14,2) check (selling_price >= 0),
  instructions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  primary key (recipe_id, item_id)
);

create table public.preparations (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id),
  batches numeric(10,2) not null check (batches > 0),
  output_quantity numeric(14,3) not null check (output_quantity > 0),
  output_unit text not null,
  prepared_by uuid not null default auth.uid() references auth.users(id),
  prepared_at timestamptz not null default now(),
  note text
);

create table public.receipt_imports (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  status public.receipt_status not null default 'uploaded',
  supplier_id uuid references public.suppliers(id),
  receipt_date date,
  subtotal numeric(14,2),
  tax numeric(14,2),
  total numeric(14,2),
  extracted_data jsonb,
  confidence numeric(5,4) check (confidence between 0 and 1),
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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
    exit when not exists (select 1 from public.inventory_items where sku = candidate);
  end loop;
  return candidate;
end;
$$;

revoke all on function private.next_inventory_sku() from public, anon, authenticated;

create or replace function private.enforce_inventory_sku()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.sku := private.next_inventory_sku();
  elsif new.sku is distinct from old.sku then
    raise exception 'Inventory SKU is immutable after creation.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_inventory_sku() from public, anon, authenticated;

create trigger enforce_inventory_sku
  before insert or update of sku on public.inventory_items
  for each row execute function private.enforce_inventory_sku();

comment on column public.inventory_items.sku is
  'Immutable system identifier in FOR-000001 format, generated and maintained by PostgreSQL.';

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select
    coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and exists(
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.preparations enable row level security;
alter table public.receipt_imports enable row level security;
alter table public.audit_log enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read departments" on public.departments for select to authenticated using (true);
create policy "admins manage departments" on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read suppliers" on public.suppliers for select to authenticated using (true);
create policy "admins manage suppliers" on public.suppliers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read inventory" on public.inventory_items for select to authenticated using (true);
create policy "staff update inventory" on public.inventory_items for update to authenticated using (true) with check (true);
create policy "admins create inventory" on public.inventory_items for insert to authenticated with check (public.is_admin());
create policy "admins delete inventory" on public.inventory_items for delete to authenticated using (public.is_admin());

create policy "staff read movements" on public.stock_movements for select to authenticated using (true);
create policy "staff create movements" on public.stock_movements for insert to authenticated with check (created_by = auth.uid());
create policy "admins correct movements" on public.stock_movements for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read recipes" on public.recipes for select to authenticated using (true);
create policy "admins manage recipes" on public.recipes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read recipe ingredients" on public.recipe_ingredients for select to authenticated using (true);
create policy "admins manage recipe ingredients" on public.recipe_ingredients for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read preparations" on public.preparations for select to authenticated using (true);
create policy "staff create preparations" on public.preparations for insert to authenticated with check (prepared_by = auth.uid());
create policy "admins manage preparations" on public.preparations for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read receipts" on public.receipt_imports for select to authenticated using (true);
create policy "staff upload receipts" on public.receipt_imports for insert to authenticated with check (uploaded_by = auth.uid());
create policy "admins approve receipts" on public.receipt_imports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit log" on public.audit_log for select to authenticated using (public.is_admin());

create index inventory_items_department_idx on public.inventory_items(department_id);
create index inventory_items_reorder_idx on public.inventory_items(quantity, reorder_point) where active;
create index movements_item_created_idx on public.stock_movements(item_id, created_at desc);
create index preparations_created_idx on public.preparations(prepared_at desc);
create index receipts_status_idx on public.receipt_imports(status, created_at desc);

insert into public.departments (name, sort_order) values
  ('Frutas y verduras', 10), ('Carnes y embutidos', 20), ('Lácteos', 30),
  ('Secos y granos', 40), ('Aceites y condimentos', 50), ('Bebidas', 60), ('Otros', 99)
on conflict do nothing;

-- Explicit Data API grants. No application tables are granted to anon.
grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.departments,
  public.suppliers,
  public.inventory_items,
  public.stock_movements,
  public.recipes,
  public.recipe_ingredients,
  public.preparations,
  public.receipt_imports
to authenticated;

grant select on table public.audit_log to authenticated;
grant execute on function public.is_admin() to authenticated;

grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Auth users receive a local application profile automatically.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Forno user'
    ),
    'local'::public.user_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();
