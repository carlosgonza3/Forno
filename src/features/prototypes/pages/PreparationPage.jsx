import {useState} from "react";
import {ChefHat, Leaf, Minus, Plus} from "lucide-react";
import {PREPARATION_OPTIONS} from "../data";

export default function PreparationPage() {
  const [counts, setCounts] = useState(
    Object.fromEntries(PREPARATION_OPTIONS.map((_, index) => [index, 0])),
  );
  const selected = Object.values(counts).filter(Boolean).length;
  const total = PREPARATION_OPTIONS.reduce((sum, _, index) => sum + counts[index], 0);

  return <div className="prep-layout">
    <div className="panel prep-builder">
      <div className="panel-head">
        <div><h2>Selecciona qué preparar</h2>
          <p>Las existencias se descontarán automáticamente al finalizar.</p></div>
        <span className="date-badge">Martes, 14 jul</span>
      </div>
      <div className="prep-cards">{PREPARATION_OPTIONS.map((item, index) =>
        <div className={`prep-card ${counts[index] ? "selected" : ""}`} key={item.name}>
          <div className="big-food">{item.emoji}</div>
          <div className="prep-card-copy"><h3>{item.name}</h3>
            <p>{item.available} {item.unit} listos</p><span>Sugerido: {item.suggested}</span></div>
          <div className="counter">
            <button onClick={() => setCounts({...counts, [index]: Math.max(0, counts[index] - 1)})}>
              <Minus size={15}/></button>
            <strong>{counts[index]}</strong>
            <button onClick={() => setCounts({...counts, [index]: counts[index] + 1})}>
              <Plus size={15}/></button>
          </div>
        </div>)}</div>
    </div>
    <aside className="panel prep-ticket">
      <div><span className="eyebrow">LISTA DE PRODUCCIÓN</span><h2>Preparación de hoy</h2>
        <p>{selected ? `${selected} tipos seleccionados` : "Aún no has seleccionado productos"}</p>
      </div>
      <div className="ticket-lines">{PREPARATION_OPTIONS.map((item, index) => counts[index]
        ? <div key={item.name}><span>{item.name}</span><strong>{counts[index]} {item.unit}</strong></div>
        : null)}</div>
      <div className="ticket-total"><span>Total a preparar</span><strong>{total}</strong></div>
      <button className="primary-btn full" disabled={!selected}><ChefHat size={18}/>Iniciar preparación</button>
      <small><Leaf size={14}/>Calcularemos los ingredientes necesarios</small>
    </aside>
  </div>;
}
