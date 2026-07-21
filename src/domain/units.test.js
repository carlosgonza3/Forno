import { describe, expect, it } from "vitest";
import {
  UnitConversionError,
  convertPackagesToBase,
  convertQuantity,
  normalizeUnit,
  roundQuantity,
} from "./units";

describe("unit conversions", () => {
  it("converts supplier packages into recipe base units", () => {
    expect(convertPackagesToBase({
      packages: 2,
      packageSize: 5,
      packageUnit: "lb",
      baseUnit: "g",
    })).toBe(4535.924);
  });

  it("supports Spanish unit aliases", () => {
    expect(normalizeUnit("Libras")).toBe("lb");
    expect(convertQuantity(1, "litro", "ml")).toBe(1000);
  });

  it("converts count-based packages", () => {
    expect(convertQuantity(3, "docenas", "unidades")).toBe(36);
  });

  it("rejects conversions across dimensions", () => {
    expect(() => convertQuantity(1, "kg", "l")).toThrowError(UnitConversionError);
    expect(() => convertQuantity(1, "kg", "l")).toThrowError(/Cannot convert mass to volume/);
  });

  it("rejects negative quantities", () => {
    expect(() => convertQuantity(-1, "kg", "g")).toThrowError(/non-negative/);
  });

  it("uses documented decimal precision", () => {
    expect(roundQuantity(1.23456, 3)).toBe(1.235);
  });
});
