import {
  BookOpen,
  ChefHat,
  LayoutDashboard,
  ReceiptText,
  ShoppingBasket,
  Warehouse,
} from "lucide-react";
import { RELEASE_SCOPES } from "../config/release";

export const PAGE_TITLES = {
  dashboard: "Resumen",
  inventory: "Inventario",
  prep: "Preparaciones",
  recipes: "Recetas",
  shopping: "Lista de compras",
  receipts: "Facturas",
  settings: "Configuración",
};

export const FULL_NAVIGATION = [
  { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { id: "inventory", label: "Inventario", icon: Warehouse },
  { id: "prep", label: "Preparación", icon: ChefHat },
  { id: "recipes", label: "Recetas", icon: BookOpen, nested: true },
  { id: "shopping", label: "Compras", icon: ShoppingBasket },
  { id: "receipts", label: "Facturas", icon: ReceiptText },
];

const RELEASE_PAGE_IDS = {
  [RELEASE_SCOPES.INVENTORY]: new Set(["inventory"]),
  [RELEASE_SCOPES.OPERATIONS]: new Set(["dashboard", "inventory", "shopping"]),
};

export function navigationForRelease(scope) {
  const enabledPages = RELEASE_PAGE_IDS[scope];
  return enabledPages
    ? FULL_NAVIGATION.filter(({ id }) => enabledPages.has(id))
    : FULL_NAVIGATION;
}

export function initialPageForRelease(scope) {
  return scope === RELEASE_SCOPES.INVENTORY ? "inventory" : "dashboard";
}
