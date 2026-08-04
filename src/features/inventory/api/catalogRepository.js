import { supabase } from "../../../lib/supabase";
import {announceActivityNotification} from "../inventoryEvents";

const ITEM_SELECT = `
  id,
  name,
  sku,
  base_unit,
  quantity,
  par_level,
  reorder_point,
  unit_cost,
  icon_key,
  icon_emoji,
  active,
  department:departments(id, name),
  supplier:suppliers(id, name)
`;
const ICON_ONLY_ITEM_SELECT = ITEM_SELECT.replace("  icon_emoji,\n", "");
const LEGACY_ITEM_SELECT = ICON_ONLY_ITEM_SELECT.replace("  icon_key,\n", "");
const PROCESSED_ITEM_SELECT = `
  id,
  name,
  sku,
  base_unit,
  quantity,
  par_level,
  reorder_point,
  unit_cost,
  active
`;
let iconFieldAvailable = true;
let emojiFieldAvailable = true;

function requireClient() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

function throwIfError(error) {
  if (error) throw error;
}

function isMissingField(error, field) {
  return ["42703", "PGRST204"].includes(error?.code)
    && String(error?.message ?? "").includes(field);
}

async function loadCatalogItems(client) {
  let retriedWithoutEmoji = false;
  let result = await client.from("inventory_items").select(ITEM_SELECT).order("name");
  if (isMissingField(result.error, "icon_emoji")) {
    retriedWithoutEmoji = true;
    emojiFieldAvailable = false;
    result = await client.from("inventory_items").select(ICON_ONLY_ITEM_SELECT).order("name");
  }
  if (isMissingField(result.error, "icon_key")) {
    iconFieldAvailable = false;
    emojiFieldAvailable = false;
    result = await client.from("inventory_items").select(LEGACY_ITEM_SELECT).order("name");
  } else if (!result.error) {
    iconFieldAvailable = true;
    emojiFieldAvailable = !retriedWithoutEmoji;
  }
  return result;
}

export async function loadCatalog() {
  const client = requireClient();
  const [itemsResult, processedItemsResult, departmentsResult, suppliersResult] = await Promise.all([
    loadCatalogItems(client),
    client.from("processed_inventory_items").select(PROCESSED_ITEM_SELECT).order("name"),
    client.from("departments").select("id, name, sort_order").order("sort_order").order("name"),
    client.from("suppliers").select("id, name, email, phone, active").order("name"),
  ]);

  throwIfError(itemsResult.error);
  throwIfError(processedItemsResult.error);
  throwIfError(departmentsResult.error);
  throwIfError(suppliersResult.error);

  return {
    items: itemsResult.data ?? [],
    processedItems: processedItemsResult.data ?? [],
    departments: departmentsResult.data ?? [],
    suppliers: suppliersResult.data ?? [],
    iconFieldAvailable,
    emojiFieldAvailable,
  };
}

export async function setProcessedInventoryExistences(entries) {
  const updates = entries.map((entry) => ({
    item_id: entry.id,
    new_quantity: Number(entry.newQuantity),
    note: entry.note?.trim() || null,
  }));
  const result = await requireClient().rpc("set_processed_inventory_existences", {updates});
  throwIfError(result.error);
  announceActivityNotification();
  return result.data ?? [];
}

export async function saveProcessedCatalogItem(values) {
  const payload = {
    name: values.name.trim(),
    base_unit: values.baseUnit.trim(),
    par_level: Number(values.parLevel),
    reorder_point: Number(values.reorderPoint),
    unit_cost: Number(values.unitCost),
    active: values.active,
    updated_at: new Date().toISOString(),
  };
  const client = requireClient();
  const result = values.id
    ? await client.from("processed_inventory_items").update(payload).eq("id", values.id).select("id").single()
    : await client.from("processed_inventory_items").insert({...payload, quantity: 0}).select("id").single();
  throwIfError(result.error);
  announceActivityNotification();
  return result.data;
}

export async function setProcessedCatalogItemActive(id, active) {
  const result = await requireClient().from("processed_inventory_items")
    .update({active, updated_at: new Date().toISOString()}).eq("id", id);
  throwIfError(result.error);
  announceActivityNotification();
}

export async function setInventoryExistences(entries) {
  const client = requireClient();
  const updates = entries.map((entry) => ({
    item_id: entry.id,
    new_quantity: Number(entry.newQuantity),
    note: entry.note?.trim() || null,
  }));
  const result = await client.rpc("set_inventory_existences", { updates });
  throwIfError(result.error);
  announceActivityNotification();
  return result.data ?? [];
}

export async function loadRecentActivityNotifications({limit = 20} = {}) {
  const client = requireClient();
  const queryLimit = Math.max(1, Number(limit) || 20);
  const result = await client.from("activity_notifications")
    .select("id, event_type, entity_type, entity_id, actor_id, actor_name, item_count, metadata, created_at")
    .order("created_at", {ascending: false})
    .order("id", {ascending: false})
    .limit(queryLimit);
  throwIfError(result.error);
  return (result.data ?? []).map((notification) => ({
    ...notification,
    id: String(notification.id),
  }));
}

export async function loadLastInventoryUpdate() {
  const result = await requireClient().from("activity_notifications")
    .select("id, event_type, created_at")
    .in("event_type", ["ingredients_updated", "processed_updated"])
    .order("created_at", {ascending: false})
    .order("id", {ascending: false})
    .limit(1);
  throwIfError(result.error);
  return result.data?.[0] ? {...result.data[0], id: String(result.data[0].id)} : null;
}

export async function loadUnreadActivityNotificationCount() {
  const client = requireClient();
  const readResult = await client.from("activity_notification_reads")
    .select("last_seen_notification_id")
    .maybeSingle();
  throwIfError(readResult.error);
  const lastSeenId = readResult.data?.last_seen_notification_id ?? 0;
  const unreadResult = await client.from("activity_notifications")
    .select("id", {count: "exact", head: true})
    .gt("id", lastSeenId);
  throwIfError(unreadResult.error);
  return unreadResult.count ?? 0;
}

export async function markActivityNotificationsViewed(notificationId) {
  const result = await requireClient().rpc("mark_activity_notifications_viewed", {
    latest_notification_id: notificationId,
  });
  throwIfError(result.error);
  return result.data;
}

export async function loadInventoryAdditionTransactions({
  page = 0,
  pageSize = 5,
  dateFrom = null,
  dateTo = null,
} = {}) {
  const client = requireClient();
  const from = page * pageSize;
  let transactionsQuery = client
    .from("inventory_addition_transactions")
    .select("id, created_by, item_count, created_at", { count: "exact" })
    .order("created_at", { ascending: true });
  if (dateFrom) transactionsQuery = transactionsQuery.gte("created_at", dateFrom);
  if (dateTo) transactionsQuery = transactionsQuery.lt("created_at", dateTo);
  const transactionsResult = await transactionsQuery.range(from, from + pageSize - 1);
  throwIfError(transactionsResult.error);

  const transactions = transactionsResult.data ?? [];
  if (!transactions.length) {
    return { transactions: [], total: transactionsResult.count ?? 0, page, pageSize };
  }

  const transactionIds = transactions.map((transaction) => transaction.id);
  const movementsResult = await client
    .from("stock_movements")
    .select("id, source_id, item_id, quantity_delta, quantity_before, quantity_after, note, created_at, item:inventory_items(name, base_unit, sku)")
    .in("source_id", transactionIds)
    .order("created_at", { ascending: true });
  throwIfError(movementsResult.error);

  const actorIds = [...new Set(transactions.map((entry) => entry.created_by).filter(Boolean))];
  let profiles = [];
  if (actorIds.length) {
    const profilesResult = await client.from("profiles").select("id, display_name").in("id", actorIds);
    throwIfError(profilesResult.error);
    profiles = profilesResult.data ?? [];
  }
  const namesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile.display_name]));
  const movementsByTransaction = (movementsResult.data ?? []).reduce((groups, movement) => {
    const entries = groups.get(movement.source_id) ?? [];
    entries.push(movement);
    groups.set(movement.source_id, entries);
    return groups;
  }, new Map());

  return {
    transactions: transactions.map((transaction) => ({
      ...transaction,
      actor_name: namesById[transaction.created_by] ?? "Usuario",
      items: movementsByTransaction.get(transaction.id) ?? [],
    })),
    total: transactionsResult.count ?? transactions.length,
    page,
    pageSize,
  };
}

export async function saveCatalogItem(values) {
  const client = requireClient();
  const payload = {
    name: values.name.trim(),
    department_id: values.departmentId || null,
    supplier_id: values.supplierId || null,
    base_unit: values.baseUnit.trim(),
    par_level: Number(values.parLevel),
    reorder_point: Number(values.reorderPoint),
    unit_cost: Number(values.unitCost),
    active: values.active,
    updated_at: new Date().toISOString(),
  };
  if (iconFieldAvailable) payload.icon_key = values.iconKey || null;
  else if (values.iconKey) {
    const error = new Error("La selección de íconos aún no está habilitada en la base de datos.");
    error.code = "ICON_FIELD_UNAVAILABLE";
    throw error;
  }
  if (emojiFieldAvailable) payload.icon_emoji = values.iconEmoji || null;
  else if (values.iconEmoji) {
    const error = new Error("La selección de emojis aún no está habilitada en la base de datos.");
    error.code = "ICON_FIELD_UNAVAILABLE";
    throw error;
  }

  const result = values.id
    ? await client.from("inventory_items").update(payload).eq("id", values.id).select("id").single()
    : await client.from("inventory_items").insert({ ...payload, quantity: 0 }).select("id").single();

  throwIfError(result.error);
  announceActivityNotification();
  return result.data;
}

export async function setCatalogItemIcon(id, { iconKey, iconEmoji }) {
  if (!iconFieldAvailable) {
    const error = new Error("La selección de íconos aún no está habilitada en la base de datos.");
    error.code = "ICON_FIELD_UNAVAILABLE";
    throw error;
  }
  if (!emojiFieldAvailable && iconEmoji) {
    const error = new Error("La selección de emojis aún no está habilitada en la base de datos.");
    error.code = "ICON_FIELD_UNAVAILABLE";
    throw error;
  }

  const payload = {
    icon_key: iconKey || null,
    updated_at: new Date().toISOString(),
  };
  if (emojiFieldAvailable) payload.icon_emoji = iconEmoji || null;

  const result = await requireClient()
    .from("inventory_items")
    .update(payload)
    .eq("id", id);
  throwIfError(result.error);
  announceActivityNotification();
}

export async function setCatalogItemActive(id, active) {
  const result = await requireClient()
    .from("inventory_items")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  throwIfError(result.error);
  announceActivityNotification();
}

export async function saveSupplier(values) {
  const client = requireClient();
  const payload = {
    name: values.name.trim(),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    active: values.active,
  };
  const result = values.id
    ? await client.from("suppliers").update(payload).eq("id", values.id).select("id").single()
    : await client.from("suppliers").insert(payload).select("id").single();
  throwIfError(result.error);
  announceActivityNotification();
  return result.data;
}

export async function setSupplierActive(id, active) {
  const result = await requireClient().from("suppliers").update({ active }).eq("id", id);
  throwIfError(result.error);
  announceActivityNotification();
}
