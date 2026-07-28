import {quantityUnitLabel} from "../inventory/catalogModel.js";

function purchaseQuantity(item) {
  return Number(item.purchaseQuantity ?? item.quantity_ordered);
}

export async function buildShoppingPdf(items, {createdAt = new Date(), logoData = null} = {}) {
  const {jsPDF} = await import("jspdf");
  const document = new jsPDF({unit: "mm", format: "a4"});
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const providers = new Set(items.map((item) => item.supplier?.name ?? item.supplier_name ?? "Sin proveedor"));
  let y = 20;

  function header() {
    document.setFillColor(159, 48, 38);
    document.roundedRect(margin, y, 22, 22, 3, 3, "F");
    if (logoData) {
      document.addImage(logoData, "PNG", margin + 2, y + 1.5, 18, 19);
    } else {
      document.setTextColor(255, 255, 255);
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      document.text("F", margin + 7.5, y + 9.5, {align: "center"});
    }
    document.setTextColor(41, 35, 31);
    document.setFontSize(9);
    document.text("FORNO", margin + 27, y + 8);
    document.setFont("helvetica", "normal");
    document.setTextColor(119, 111, 104);
    document.text("LISTA DE COMPRAS", margin + 27, y + 14);
    document.setTextColor(41, 35, 31);
    document.setFont("helvetica", "bold");
    document.setFontSize(20);
    document.text("Lista para comprar", margin, y + 35);
    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    document.setTextColor(119, 111, 104);
    document.text(new Date(createdAt).toLocaleString("es-SV", {dateStyle: "long", timeStyle: "short"}), margin, y + 42);
    y += 51;
  }

  function summary() {
    const boxWidth = (contentWidth - 5) / 2;
    document.setFillColor(247, 242, 236);
    document.roundedRect(margin, y, boxWidth, 18, 2, 2, "F");
    document.roundedRect(margin + boxWidth + 5, y, boxWidth, 18, 2, 2, "F");
    document.setFontSize(8);
    document.setTextColor(119, 111, 104);
    document.text("INGREDIENTES", margin + 5, y + 6);
    document.text("PROVEEDORES", margin + boxWidth + 10, y + 6);
    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.setTextColor(41, 35, 31);
    document.text(String(items.length), margin + 5, y + 13);
    document.text(String(providers.size), margin + boxWidth + 10, y + 13);
    document.setFont("helvetica", "normal");
    y += 26;
  }

  function tableHeader() {
    document.setFillColor(159, 48, 38);
    document.rect(margin, y, contentWidth, 10, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(8);
    document.text("INGREDIENTE", margin + 4, y + 6.5);
    document.text("PROVEEDOR", margin + 80, y + 6.5);
    document.text("CANTIDAD", pageWidth - margin - 4, y + 6.5, {align: "right"});
    y += 10;
  }

  function newPage() {
    document.addPage();
    y = 18;
    document.setFont("helvetica", "bold");
    document.setFontSize(11);
    document.setTextColor(41, 35, 31);
    document.text("Lista para comprar - continuacion", margin, y);
    y += 7;
    tableHeader();
  }

  header();
  summary();
  tableHeader();

  for (const item of items) {
    const supplier = item.supplier?.name ?? item.supplier_name ?? "Sin proveedor";
    const quantity = purchaseQuantity(item);
    const ingredientLines = document.splitTextToSize(item.name ?? item.item_name, 68);
    const supplierLines = document.splitTextToSize(supplier, 55);
    const lineCount = Math.max(ingredientLines.length, supplierLines.length);
    const rowHeight = Math.max(12, 5 + lineCount * 4);
    if (y + rowHeight > pageHeight - 20) newPage();
    document.setDrawColor(230, 222, 211);
    document.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    document.setFont("helvetica", "bold");
    document.setFontSize(9);
    document.setTextColor(41, 35, 31);
    document.text(ingredientLines, margin + 4, y + 6);
    document.setFont("helvetica", "normal");
    document.setTextColor(92, 96, 88);
    document.text(supplierLines, margin + 80, y + 6);
    document.setFont("helvetica", "bold");
    document.setTextColor(41, 35, 31);
    document.text(
      `${quantity.toLocaleString("es-SV")} ${quantityUnitLabel(item.base_unit, quantity)}`,
      pageWidth - margin - 4,
      y + 6,
      {align: "right"},
    );
    y += rowHeight;
  }

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(145, 139, 132);
    document.text(`Forno - Pagina ${page} de ${pages}`, pageWidth / 2, pageHeight - 9, {align: "center"});
  }
  return document.output("arraybuffer");
}

export async function downloadShoppingPdf(items, options = {}) {
  let logoData = options.logoData ?? null;
  if (!logoData && options.logoUrl) {
    const response = await fetch(options.logoUrl);
    if (response.ok) logoData = new Uint8Array(await response.arrayBuffer());
  }
  const bytes = await buildShoppingPdf(items, {...options, logoData});
  const blob = new Blob([bytes], {type: "application/pdf"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `forno-compras-${new Date(options.createdAt ?? Date.now()).toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
