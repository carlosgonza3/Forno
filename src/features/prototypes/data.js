export const PREPARATION_OPTIONS = [
  {name: "Bolas de masa", unit: "unidades", available: 42, suggested: 60, emoji: "🫓"},
  {name: "Salsa pomodoro", unit: "contenedores 2 L", available: 4, suggested: 6, emoji: "🥫"},
  {name: "Mozzarella porcionada", unit: "bandejas", available: 3, suggested: 5, emoji: "🧀"},
  {name: "Vegetales asados", unit: "contenedores 1 L", available: 2, suggested: 3, emoji: "🫑"},
];

export const RECIPES = [
  {
    name: "Pizza Margherita", category: "Pizza", prep: "8 min", cost: 3.48,
    margin: 68, stock: 18, emoji: "🍕", ingredients: 6,
  },
  {
    name: "Pizza Prosciutto", category: "Pizza", prep: "10 min", cost: 5.12,
    margin: 63, stock: 12, emoji: "🍕", ingredients: 7,
  },
  {
    name: "Salsa pomodoro", category: "Preparación base", prep: "45 min", cost: 7.8,
    margin: null, stock: 4, emoji: "🥫", ingredients: 5,
  },
  {
    name: "Masa napolitana", category: "Preparación base", prep: "24 h", cost: 0.68,
    margin: null, stock: 42, emoji: "🫓", ingredients: 4,
  },
];

export function formatMoney(value) {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
