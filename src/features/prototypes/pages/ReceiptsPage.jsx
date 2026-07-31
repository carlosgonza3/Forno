import {ChevronDown, ReceiptText, Upload} from "lucide-react";

const RECEIPTS = [
  {type: "PDF", supplier: "Mercado Central", detail: "14 jul · 18 productos", total: "$186.42", status: "Procesada"},
  {type: "JPG", supplier: "Distribuidora Roma", detail: "12 jul · 8 productos", total: "$324.10", status: "Procesada"},
  {type: "PDF", supplier: "Pricesmart", detail: "10 jul · 23 productos", total: "$419.80", status: "Revisar"},
];

export default function ReceiptsPage({onUpload}) {
  return <div className="receipts-layout">
    <button className="upload-zone" onClick={onUpload}>
      <div className="upload-icon"><ReceiptText size={30}/></div>
      <h2>Suelta una factura aquí</h2>
      <p>Forno AI reconocerá proveedor, productos, cantidades, precios e impuestos.</p>
      <span className="primary-btn"><Upload size={17}/>Elegir archivo</span>
      <small>PDF, JPG o PNG · máximo 10 MB</small>
    </button>
    <div className="panel recent-receipts">
      <div className="panel-head"><div><h2>Facturas recientes</h2>
        <p>Compras procesadas este mes</p></div>
        <button className="select-btn">Julio 2026 <ChevronDown size={15}/></button>
      </div>
      {RECEIPTS.map((receipt) => <div className="receipt-row" key={receipt.supplier}>
        <div className="file-icon">{receipt.type}</div>
        <div><strong>{receipt.supplier}</strong><span>{receipt.detail}</span></div>
        <b>{receipt.total}</b>
        <span className={`status ${receipt.status === "Procesada" ? "healthy" : "low"}`}>
          <span/>{receipt.status}</span>
      </div>)}
    </div>
  </div>;
}
