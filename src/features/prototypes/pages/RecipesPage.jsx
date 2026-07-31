import {ChevronRight} from "lucide-react";
import {formatMoney, RECIPES} from "../data";

export default function RecipesPage() {
  return <div className="recipe-grid">{RECIPES.map((recipe, index) =>
    <article className="panel recipe-card" key={recipe.name}>
      <div className={`recipe-visual rv-${index}`}><span>{recipe.emoji}</span><button>•••</button></div>
      <div className="recipe-body">
        <div><span className="category-tag">{recipe.category}</span><h2>{recipe.name}</h2></div>
        <div className="recipe-stats">
          <div><span>Ingredientes</span><strong>{recipe.ingredients}</strong></div>
          <div><span>Preparación</span><strong>{recipe.prep}</strong></div>
          <div><span>Disponibles</span><strong>{recipe.stock}</strong></div>
        </div>
        <div className="recipe-footer">
          <div><span>Costo por porción</span><strong>{formatMoney(recipe.cost)}</strong></div>
          {recipe.margin && <div className="margin"><span>Margen</span><strong>{recipe.margin}%</strong></div>}
          <button className="icon-btn"><ChevronRight size={18}/></button>
        </div>
      </div>
    </article>)}</div>;
}
