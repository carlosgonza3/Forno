import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {
    IngredientIcon,
    INGREDIENT_ICON_OPTIONS,
    recommendIngredientIcons,
    searchIngredientIcons,
} from "./ingredientIcons";

describe("ingredient icons", () => {
    it("keeps every stored key unique", () => {
        const keys = INGREDIENT_ICON_OPTIONS.map((option) => option.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it("falls back safely when an old or unknown key is encountered", () => {
        const {container} = render(<IngredientIcon iconKey="unknown-icon" aria-label="Ingrediente"/>);
        expect(screen.getByLabelText("Ingrediente")).toBeInTheDocument();
        expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("searches accent-insensitively and recommends from ingredient context", () => {
        expect(searchIngredientIcons("lacteo").map((option) => option.key)).toContain("dairy");
        expect(recommendIngredientIcons("Tomate · Frutas y verduras")[0].key).toBe("produce");
    });

    it("renders a selected emoji instead of the SVG fallback", () => {
        const {container} = render(<IngredientIcon iconKey="meat" iconEmoji="🍕" size={20}/>);
        const emoji = screen.getByRole("img", {name: "Ícono del ingrediente"});
        expect(emoji).toHaveTextContent("🍕");
        expect(emoji).toHaveStyle({fontSize: "24px"});
        expect(container.querySelector("svg")).not.toBeInTheDocument();
    });
});
