-- Requested clean slate for operational data only.
-- Preserve catalog fields, inventory thresholds, suppliers, users, policies,
-- purchase configuration, and all unrelated client database changes.

-- Purchase-list items are removed by the parent table's cascade.
delete from public.purchase_lists;

-- Clear the complete inventory movement and grouped activity history.
delete from public.stock_movements;
delete from public.inventory_addition_transactions;

-- Reset only the current stock quantity.
update public.inventory_items
set quantity = 0
where quantity <> 0;
