-- Requested clean slate for operational history only.
-- Preserve catalog configuration, suppliers, users, policies, and schemas.

-- Saved purchase-list items are removed by the parent table's cascade.
delete from public.purchase_lists;

-- Clear the complete inventory movement/activity audit trail.
delete from public.stock_movements;
delete from public.inventory_addition_transactions;

-- Reset only the existing quantity value; leave all other item fields intact.
update public.inventory_items
set quantity = 0
where quantity <> 0;
