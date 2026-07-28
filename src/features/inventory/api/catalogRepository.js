import { supabase } from "../../../lib/supabase";

const ITEM_SELECT = `
  id,
  name,
  sku,
  base_unit,
  quantity,
  par_level,
  reorder_point,
  unit_cost,
  active,
  department:departments(id, name),
  supplier:suppliers(id, name)
`;

function requireClient() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

function throwIfError(error) {
  if (error) throw error;
}

export async function loadCatalog() {
  const client = requireClient();
  const [itemsResult, departmentsResult, suppliersResult] = await Promise.all([
    client.from("inventory_items").select(ITEM_SELECT).order("name"),
    client.from("departments").select("id, name, sort_order").order("sort_order").order("name"),
    client.from("suppliers").select("id, name, email, phone, active").order("name"),
  ]);

  throwIfError(itemsResult.error);
  throwIfError(departmentsResult.error);
  throwIfError(suppliersResult.error);

  return {
    items: itemsResult.data ?? [],
    departments: departmentsResult.data ?? [],
    suppliers: suppliersResult.data ?? [],
  };
}

export async function addInventoryExistences(entries) {
  const client = requireClient();
  const additions = entries.map((entry) => ({
    item_id: entry.id,
    quantity: Number(entry.increment),
  }));
  const result = await client.rpc("add_inventory_existences", { additions });
  throwIfError(result.error);
  return result.data ?? [];
}

export async function loadInventoryAdditionTransactions({ page = 0, pageSize = 5 } = {}) {
  const client = requireClient();
  const from = page * pageSize;
  const transactionsResult = await client
    .from("inventory_addition_transactions")
    .select("id, created_by, item_count, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  throwIfError(transactionsResult.error);

  const transactions = transactionsResult.data ?? [];
  if (!transactions.length) {
    return { transactions: [], total: transactionsResult.count ?? 0, page, pageSize };
  }

  const transactionIds = transactions.map((transaction) => transaction.id);
  const movementsResult = await client
    .from("stock_movements")
    .select("id, source_id, item_id, quantity_delta, quantity_before, quantity_after, created_at, item:inventory_items(name, base_unit, sku)")
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

  const result = values.id
    ? await client.from("inventory_items").update(payload).eq("id", values.id).select("id").single()
    : await client.from("inventory_items").insert({ ...payload, quantity: 0 }).select("id").single();

  throwIfError(result.error);
  return result.data;
}

export async function setCatalogItemActive(id, active) {
  const result = await requireClient()
    .from("inventory_items")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  throwIfError(result.error);
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
  return result.data;
}

export async function setSupplierActive(id, active) {
  const result = await requireClient().from("suppliers").update({ active }).eq("id", id);
  throwIfError(result.error);
}
