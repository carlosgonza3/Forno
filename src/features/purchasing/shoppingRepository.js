import {supabase} from "../../lib/supabase";
import {loadCatalog} from "../inventory/api/catalogRepository";

function requireClient() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

export async function loadShoppingWorkspace() {
  const client = requireClient();
  const [catalog, decisionsResult, pendingItemsResult, listsResult] = await Promise.all([
    loadCatalog(),
    client.from("shopping_list_items").select("item_id, quantity_override, included, updated_at"),
    client.from("purchase_list_items").select("item_id").eq("pending", true),
    client.from("purchase_lists")
      .select("id, status, item_count, created_by, created_at, received_by, received_at, items:purchase_list_items(item_id, item_name, supplier_name, base_unit, quantity_ordered)")
      .order("created_at", {ascending: false})
      .limit(50),
  ]);
  if (decisionsResult.error) throw decisionsResult.error;
  if (pendingItemsResult.error) throw pendingItemsResult.error;
  if (listsResult.error) throw listsResult.error;
  return {
    catalog,
    decisions: decisionsResult.data ?? [],
    pendingItemIds: (pendingItemsResult.data ?? []).map((entry) => entry.item_id),
    lists: listsResult.data ?? [],
  };
}

export async function saveShoppingDecision({itemId, quantityOverride, included}) {
  const result = await requireClient().from("shopping_list_items").upsert({
    item_id: itemId,
    quantity_override: quantityOverride,
    included,
  }, {onConflict: "item_id"});
  if (result.error) throw result.error;
}

export async function saveShoppingDecisions(decisions) {
  const result = await requireClient().from("shopping_list_items").upsert(
    decisions.map(({itemId, quantityOverride, included}) => ({
      item_id: itemId,
      quantity_override: quantityOverride,
      included,
    })),
    {onConflict: "item_id"},
  );
  if (result.error) throw result.error;
}

export async function resetShoppingDecision(itemId) {
  const result = await requireClient().from("shopping_list_items").delete().eq("item_id", itemId);
  if (result.error) throw result.error;
}

export async function createPurchaseList(items) {
  const orderItems = items.map((item) => ({
    item_id: item.id,
    quantity: Number(item.purchaseQuantity),
  }));
  const result = await requireClient().rpc("create_purchase_list", {order_items: orderItems});
  if (result.error) throw result.error;
  return result.data;
}

export async function receivePurchaseList(listId) {
  const result = await requireClient().rpc("receive_purchase_list", {target_list_id: listId});
  if (result.error) throw result.error;
  return result.data;
}
