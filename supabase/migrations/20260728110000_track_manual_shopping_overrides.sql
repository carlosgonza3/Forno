-- Distinguish a quantity explicitly entered by a user from legacy calculated
-- suggestions that were previously persisted as overrides. Existing values
-- are preserved but remain unmarked, so the live suggestion is used.

alter table public.shopping_list_items
  add column quantity_manually_overridden boolean not null default false;
