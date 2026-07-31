alter table public.inventory_items
  add column if not exists icon_key text;

comment on column public.inventory_items.icon_key is
  'Optional key from the application ingredient icon bank. NULL uses the default icon.';

alter table public.inventory_items
  drop constraint if exists inventory_items_icon_key_check;

alter table public.inventory_items
  add constraint inventory_items_icon_key_check
  check (
    icon_key is null
    or icon_key in (
      'produce', 'fruit', 'herbs', 'meat', 'seafood', 'dairy', 'eggs',
      'grains', 'berries', 'prepared', 'bakery', 'beverages', 'wine', 'packaged'
    )
  );
