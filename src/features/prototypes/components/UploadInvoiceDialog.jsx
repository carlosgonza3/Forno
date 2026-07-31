import {useState} from "react";
import {Check, CheckCircle2, Sparkles, Upload, X} from "lucide-react";

export default function UploadInvoiceDialog({onClose}) {
  const [stage, setStage] = useState("upload");
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Cerrar"><X size={18}/></button>
      {stage === "upload" ? <>
        <div className="modal-art"><Sparkles size={28}/></div>
        <span className="eyebrow">FORNO AI</span><h2>Registra una compra</h2>
        <p>Sube una foto o PDF de la factura. Puedes revisar cada dato antes de actualizar el inventario.</p>
        <button className="modal-drop" onClick={() => setStage("done")}><Upload size={24}/>
          <strong>Seleccionar factura</strong><span>o arrastra el archivo aquí</span></button>
        <div className="secure-note"><CheckCircle2 size={16}/>Archivo cifrado durante la transferencia</div>
      </> : <>
        <div className="success-mark"><Check size={30}/></div>
        <h2>¡Factura lista!</h2>
        <p>Detectamos 18 productos de Mercado Central por un total de <strong>$186.42</strong>.</p>
        <div className="scan-summary"><span>Confianza de lectura</span><strong>98.4%</strong></div>
        <button className="primary-btn full" onClick={onClose}>Revisar productos</button>
      </>}
    </div>
  </div>;
}
