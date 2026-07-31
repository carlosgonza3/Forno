alter table public.inventory_items
  add column if not exists icon_emoji text;

comment on column public.inventory_items.icon_emoji is
  'Optional user-selected emoji. NULL keeps the curated SVG icon selected by icon_key.';

alter table public.inventory_items
  drop constraint if exists inventory_items_icon_emoji_check;

alter table public.inventory_items
  add constraint inventory_items_icon_emoji_check
  check (icon_emoji is null or char_length(icon_emoji) between 1 and 32);
