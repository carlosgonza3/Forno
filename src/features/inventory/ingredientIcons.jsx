import {
    Apple, Beef, Boxes, CakeSlice, Carrot, Cherry, Coffee, CookingPot,
    Egg, Fish, Milk, Package, Vegan, Wheat, Wine,
} from "lucide-react";

export const INGREDIENT_ICON_OPTIONS = [
    {key: "", label: "General", Icon: Boxes, keywords: ["caja", "inventario", "otro"]},
    {key: "produce", label: "Vegetales", Icon: Carrot, keywords: ["verdura", "vegetal", "hortaliza", "tomate", "cebolla"]},
    {key: "fruit", label: "Frutas", Icon: Apple, keywords: ["fruta", "manzana", "cítrico", "limón"]},
    {key: "herbs", label: "Hierbas", Icon: Vegan, keywords: ["hierba", "hoja", "albahaca", "perejil", "cilantro"]},
    {key: "meat", label: "Carnes", Icon: Beef, keywords: ["carne", "res", "cerdo", "pollo", "embutido"]},
    {key: "seafood", label: "Mariscos", Icon: Fish, keywords: ["pescado", "marisco", "camarón", "salmón"]},
    {key: "dairy", label: "Lácteos", Icon: Milk, keywords: ["lácteo", "leche", "queso", "crema", "mantequilla"]},
    {key: "eggs", label: "Huevos", Icon: Egg, keywords: ["huevo"]},
    {key: "grains", label: "Granos", Icon: Wheat, keywords: ["grano", "harina", "arroz", "trigo", "pasta"]},
    {key: "berries", label: "Frutos", Icon: Cherry, keywords: ["fruto", "cereza", "fresa", "baya"]},
    {key: "prepared", label: "Preparados", Icon: CookingPot, keywords: ["preparado", "salsa", "caldo", "sopa", "cocina"]},
    {key: "bakery", label: "Panadería", Icon: CakeSlice, keywords: ["pan", "pastel", "postre", "repostería"]},
    {key: "beverages", label: "Bebidas", Icon: Coffee, keywords: ["bebida", "café", "té", "jugo"]},
    {key: "wine", label: "Vinos", Icon: Wine, keywords: ["vino", "licor", "alcohol"]},
    {key: "packaged", label: "Empacados", Icon: Package, keywords: ["empaque", "paquete", "enlatado"]},
];

const ingredientIcons = new Map(INGREDIENT_ICON_OPTIONS.map((option) => [option.key, option]));

function normalize(value) {
    return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

export function searchIngredientIcons(query, options = INGREDIENT_ICON_OPTIONS) {
    const normalized = normalize(query).trim();
    if (!normalized) return options;
    return options.filter((option) => normalize([option.label, ...option.keywords].join(" ")).includes(normalized));
}

export function recommendIngredientIcons(context) {
    const normalized = normalize(context);
    const matches = INGREDIENT_ICON_OPTIONS.filter((option) => option.key
        && option.keywords.some((keyword) => normalized.includes(normalize(keyword))));
    const defaults = ["produce", "meat", "dairy", "grains", "prepared"]
        .map((key) => ingredientIcons.get(key));
    return [...new Map([...matches, ...defaults].map((option) => [option.key, option])).values()].slice(0, 5);
}

export function ingredientIconOption(iconKey) {
    return ingredientIcons.get(iconKey ?? "") ?? ingredientIcons.get("");
}

export function IngredientIcon({iconKey, iconEmoji, className = "", size = 18, style, ...props}) {
    if (iconEmoji) {
        const emojiSize = typeof size === "number" ? `${Math.round(size * 1.18)}px` : size;
        return <span className={`ingredient-emoji ${className}`.trim()} role="img"
            aria-label={props["aria-label"] || "Ícono del ingrediente"}
            style={{fontSize: emojiSize, ...style}}>{iconEmoji}</span>;
    }
    const Icon = ingredientIconOption(iconKey).Icon;
    return <Icon className={className} size={size} style={style} {...props}/>;
}
