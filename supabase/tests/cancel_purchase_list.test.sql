begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'cancel-purchase-test@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Cancel purchase test"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

insert into public.inventory_items (
  id,
  name,
  base_unit,
  quantity,
  par_level,
  reorder_point
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Queso Mascarpone - cancellation regression test',
  'lb',
  10,
  10,
  2
);

insert into public.shopping_list_items (
  item_id,
  quantity_override,
  included,
  quantity_manually_overridden
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  3,
  true,
  true
);

insert into public.purchase_lists (
  id,
  status,
  item_count,
  created_by
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'pending',
  1,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

insert into public.purchase_list_items (
  list_id,
  item_id,
  item_name,
  supplier_name,
  base_unit,
  quantity_ordered,
  pending
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Queso Mascarpone',
  'Proveedor de prueba',
  'lb',
  3,
  true
);

set local role authenticated;

select is(
  public.cancel_purchase_list('cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1::bigint,
  'cancels the one pending purchase-list item'
);

select is(
  (select status from public.purchase_lists where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'cancelled'::text,
  'marks the purchase list as cancelled'
);

select is(
  (select cancelled_by from public.purchase_lists where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'records the authenticated actor who cancelled the list'
);

select ok(
  (select cancelled_at is not null from public.purchase_lists where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'records when the purchase list was cancelled'
);

select is(
  (select pending from public.purchase_list_items
    where list_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      and item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  false,
  'releases the item from the pending-order constraint'
);

select is(
  (select included from public.shopping_list_items where item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  false,
  'does not silently select the cancelled item for the next order'
);

select ok(
  (select quantity_override is null from public.shopping_list_items
    where item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'clears the stale ordered quantity'
);

select is(
  (select quantity_manually_overridden from public.shopping_list_items
    where item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  false,
  'clears the stale manual-quantity flag'
);

select is(
  (select quantity from public.inventory_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  10::numeric,
  'does not change inventory quantity'
);

select is(
  (select count(*) from public.stock_movements where item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'does not create an inventory movement'
);

select is(
  (select quantity_ordered from public.purchase_list_items
    where list_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      and item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  3::numeric,
  'preserves the cancelled order history'
);

select * from finish();

rollback;
