const UNIT_DEFINITIONS = Object.freeze({
  g: { dimension: "mass", toBase: 1 },
  kg: { dimension: "mass", toBase: 1000 },
  oz: { dimension: "mass", toBase: 28.349523125 },
  lb: { dimension: "mass", toBase: 453.59237 },
  ml: { dimension: "volume", toBase: 1 },
  l: { dimension: "volume", toBase: 1000 },
  tsp: { dimension: "volume", toBase: 4.92892159375 },
  tbsp: { dimension: "volume", toBase: 14.78676478125 },
  unit: { dimension: "count", toBase: 1 },
  dozen: { dimension: "count", toBase: 12 },
});

const UNIT_ALIASES = Object.freeze({
  gram: "g",
  grams: "g",
  gramo: "g",
  gramos: "g",
  kilogram: "kg",
  kilograms: "kg",
  kilogramo: "kg",
  kilogramos: "kg",
  libra: "lb",
  libras: "lb",
  onza: "oz",
  onzas: "oz",
  liter: "l",
  liters: "l",
  litro: "l",
  litros: "l",
  milliliter: "ml",
  milliliters: "ml",
  mililitro: "ml",
  mililitros: "ml",
  unidad: "unit",
  unidades: "unit",
  docena: "dozen",
  docenas: "dozen",
});

export class UnitConversionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "UnitConversionError";
    this.code = code;
  }
}

export function normalizeUnit(unit) {
  const normalized = String(unit ?? "").trim().toLowerCase();
  return UNIT_ALIASES[normalized] ?? normalized;
}

export function getUnitDefinition(unit) {
  const normalized = normalizeUnit(unit);
  const definition = UNIT_DEFINITIONS[normalized];
  if (!definition) {
    throw new UnitConversionError(`Unsupported unit: ${unit}`, "UNSUPPORTED_UNIT");
  }
  return { ...definition, unit: normalized };
}

export function convertQuantity(quantity, fromUnit, toUnit, precision = 3) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new UnitConversionError("Quantity must be a finite, non-negative number", "INVALID_QUANTITY");
  }

  const from = getUnitDefinition(fromUnit);
  const to = getUnitDefinition(toUnit);
  if (from.dimension !== to.dimension) {
    throw new UnitConversionError(
      `Cannot convert ${from.dimension} to ${to.dimension}`,
      "INCOMPATIBLE_DIMENSIONS",
    );
  }

  const converted = (quantity * from.toBase) / to.toBase;
  return roundQuantity(converted, precision);
}

export function convertPackagesToBase({ packages, packageSize, packageUnit, baseUnit, precision = 3 }) {
  if (!Number.isFinite(packages) || packages < 0 || !Number.isFinite(packageSize) || packageSize <= 0) {
    throw new UnitConversionError("Packages and package size must be valid positive values", "INVALID_PACKAGE");
  }
  return convertQuantity(packages * packageSize, packageUnit, baseUnit, precision);
}

export function roundQuantity(value, precision = 3) {
  if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
    throw new UnitConversionError("Precision must be an integer between 0 and 6", "INVALID_PRECISION");
  }
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export const supportedUnits = Object.freeze(Object.keys(UNIT_DEFINITIONS));
