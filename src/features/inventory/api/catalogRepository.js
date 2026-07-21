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
