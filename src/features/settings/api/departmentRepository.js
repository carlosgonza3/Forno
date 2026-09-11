import {supabase} from "../../../lib/supabase";

function requireClient() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

function throwIfError(error) {
  if (error) throw error;
}

export async function loadDepartmentSettings() {
  const result = await requireClient().rpc("get_department_settings");
  throwIfError(result.error);
  return result.data ?? [];
}

export async function createDepartment(name) {
  const result = await requireClient().rpc("create_inventory_department", {
    department_name: name,
  });
  throwIfError(result.error);
  return result.data;
}

export async function deleteDepartment(id, {unassignItems = false} = {}) {
  const result = await requireClient().rpc("delete_inventory_department", {
    target_department_id: id,
    unassign_items: unassignItems,
  });
  throwIfError(result.error);
  return result.data;
}
