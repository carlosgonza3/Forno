-- Group selection previously persisted the calculated reorder-point quantity
-- as though it were a manual override. Clear only values that exactly match
-- that legacy formula, allowing the current ideal-level suggestion to appear.
-- Pending and historical purchase-list items are not modified.

alter table public.shopping_list_items
  disable trigger set_shopping_list_audit;

update public.shopping_list_items as decision
set quantity_override = null
from public.inventory_items as item
where item.id = decision.item_id
  and decision.quantity_override = greatest(
    0::numeric,
    item.reorder_point - item.quantity
  )
  and decision.quantity_override <> greatest(
    0::numeric,
    item.par_level - item.quantity
  );

alter table public.shopping_list_items
  enable trigger set_shopping_list_audit;
