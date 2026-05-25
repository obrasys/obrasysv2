import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { ClosingSheet } from "@/hooks/useClosingSheets";
import type { ClosingSheetDetails, ClosingTotals } from "@/types/closing-sheet";

const TEAL: [number, number, number] = [15, 76, 92]; // Deep Teal #0F4C5C
const MUTED: [number, number, number] = [115, 115, 115];
const LIGHT: [number, number, number] = [240, 244, 246];

const fmtEur = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);
const fmtPct = (v: number) => `${((v ?? 0) * 100).toFixed(2).replace(".", ",")}%`;

interface CompanyInfo {
  empresa_nome?: string | null;
  empresa_nif?: string | null;
  empresa_morada?: string | null;
  empresa_telefone?: string | null;
  empresa_email?: string | null;
  empresa_logo_url?: string | null;
}

async function loadLogo(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportClosingSheetPDF(params: {
  sheet: ClosingSheet;
  details: ClosingSheetDetails;
  totals: ClosingTotals;
  company: CompanyInfo;
  sheetCode: string;
}) {
  const { sheet, details, totals, company, sheetCode } = params;
  const isInitial = sheet.closing_type === "initial";
  const docTitle = `Folha de Fecho ${isInitial ? "Inicial" : "Final"}`;

  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const logoData = await loadLogo(company.empresa_logo_url);

  const drawHeader = () => {
    // Logo
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", margin, 10, 18, 18);
      } catch {
        // ignore
      }
    } else {
      doc.setDrawColor(220);
      doc.rect(margin, 10, 18, 18);
    }

    // Company info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(company.empresa_nome || "—", margin + 22, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const lines: string[] = [];
    if (company.empresa_nif) lines.push(`NIF: ${company.empresa_nif}`);
    if (company.empresa_morada) lines.push(company.empresa_morada);
    const contact = [company.empresa_telefone, company.empresa_email].filter(Boolean).join(" · ");
    if (contact) lines.push(contact);
    lines.forEach((l, i) => doc.text(l, margin + 22, 18 + i * 3.5));

    // Right side: title + code
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(docTitle.toUpperCase(), pageW - margin, 14, { align: "right" });
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20);
    doc.text(sheetCode, pageW - margin, 19, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Emitido: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })}`,
      pageW - margin,
      23,
      { align: "right" },
    );

    // Divider
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageW - margin, 32);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(sheetCode, margin, pageH - 8);
    doc.text(
      `${docTitle} · ${company.empresa_nome || ""}`,
      pageW / 2,
      pageH - 8,
      { align: "center" },
    );
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  };

  let cursorY = 40;

  // Hero KPI strip
  const drawKpiStrip = () => {
    const kpis = [
      { label: "Custo Industrial", value: fmtEur(totals.custo_industrial) },
      { label: "Custo Total da Obra", value: fmtEur(totals.custo_total), primary: true },
      { label: "Valor de Vendas", value: fmtEur(totals.valor_vendas) },
      { label: "RAI €", value: fmtEur(totals.rai_eur), positive: totals.rai_eur >= 0 },
      { label: "RAI %", value: fmtPct(totals.rai_pct), positive: totals.rai_pct >= 0 },
    ];
    const cardW = (pageW - margin * 2 - 4 * 2) / kpis.length;
    let x = margin;
    kpis.forEach((k) => {
      const bg: [number, number, number] = k.primary
        ? TEAL
        : k.positive === false
          ? [254, 226, 226]
          : k.positive === true
            ? [220, 252, 231]
            : LIGHT;
      const fg: [number, number, number] = k.primary ? [255, 255, 255] : [20, 20, 20];
      doc.setFillColor(...bg);
      doc.roundedRect(x, cursorY, cardW, 18, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(k.primary ? 220 : MUTED[0], k.primary ? 220 : MUTED[1], k.primary ? 220 : MUTED[2]);
      doc.text(k.label.toUpperCase(), x + 2, cursorY + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...fg);
      doc.text(k.value, x + 2, cursorY + 13);
      x += cardW + 2;
    });
    cursorY += 22;
  };

  const sectionTitle = (label: string) => {
    if (cursorY > pageH - 30) {
      doc.addPage();
      drawHeader();
      cursorY = 40;
    }
    doc.setFillColor(...TEAL);
    doc.rect(margin, cursorY, 1.5, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(label.toUpperCase(), margin + 4, cursorY + 4.5);
    cursorY += 8;
  };

  drawHeader();
  drawKpiStrip();

  // Header section: project metadata
  sectionTitle("Dados da Obra");
  const headerRows: [string, string][] = [
    ["Nome da Obra", details.header.nome_obra || "—"],
    ["Nº / Lote", details.header.numero_lote || "—"],
    ["Designação", details.header.designacao || "—"],
    ["Dono de Obra", details.header.dono_obra || "—"],
    ["Regime", details.header.regime_empreitada || "—"],
    ["Tipo de Obra", details.header.tipo_obra || "—"],
    ["Localização", details.header.localizacao || "—"],
    ["Prazo (meses)", String(details.header.prazo_meses ?? "—")],
    ["Nº Frações", String(details.header.num_fraccoes ?? "—")],
    ["Proj. Arquitectura", details.header.proj_arquitectura || "—"],
    ["Proj. Engenharia", details.header.proj_engenharia || "—"],
    ["Responsável Orçamento", details.header.responsavel_orcamento || "—"],
  ];
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    body: headerRows.reduce<string[][]>((acc, _, i) => {
      if (i % 2 === 0) acc.push([headerRows[i][0], headerRows[i][1], headerRows[i + 1]?.[0] || "", headerRows[i + 1]?.[1] || ""]);
      return acc;
    }, []),
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED, cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", textColor: MUTED, cellWidth: 35 },
      3: { cellWidth: 55 },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // Direct costs
  sectionTitle("Custos Directos / Preços Secos (s/ IVA)");
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [["Rubrica", "Valor (€)", "% s/ Total", "Empresa"]],
    body: details.direct_costs
      .filter((l) => l.value > 0)
      .map((l) => [
        l.label,
        fmtEur(l.value),
        totals.total_directos > 0 ? `${((l.value / totals.total_directos) * 100).toFixed(1)}%` : "—",
        l.empresa || "—",
      ]),
    foot: [["TOTAL CUSTOS DIRECTOS (A)", fmtEur(totals.total_directos), "", ""]],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: 8 },
    footStyles: { fillColor: LIGHT, textColor: 20, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // Site costs
  sectionTitle("Custos de Estaleiro");
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [["Rubrica", "Valor (€)"]],
    body: details.site_costs
      .filter((l) => l.value > 0)
      .map((l) => [l.label, fmtEur(l.value)]),
    foot: [["TOTAL ESTALEIRO (B)", fmtEur(totals.total_estaleiro)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: 8 },
    footStyles: { fillColor: LIGHT, textColor: 20, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right", cellWidth: 50 } },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // Sales
  if (details.sales.length > 0) {
    sectionTitle("Mapa de Vendas Comercial");
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["Tipologia", "Quant.", "Área (m²)", "Preço m² (€)", "Total (€)"]],
      body: details.sales.map((l) => [
        l.tipologia || "—",
        String(l.quantidade),
        String(l.area_priv),
        fmtEur(l.preco_m2),
        fmtEur((l.quantidade || 0) * (l.area_priv || 0) * (l.preco_m2 || 0)),
      ]),
      foot: [["TOTAL", "", "", "", fmtEur(totals.valor_vendas)]],
      theme: "striped",
      headStyles: { fillColor: TEAL, fontSize: 8 },
      footStyles: { fillColor: LIGHT, textColor: 20, fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Final summary block
  if (cursorY > pageH - 60) {
    doc.addPage();
    drawHeader();
    cursorY = 40;
  }
  sectionTitle("Resumo Económico");
  const summary: [string, number, [number, number, number]?][] = [
    ["(1) Custo Industrial (Directos + Estaleiro)", totals.custo_industrial],
    ["(2) Terreno", totals.total_terreno],
    ["(3) Indirectos", totals.total_indirectos],
    ["(4) Outros", totals.total_outros],
    ["(5) Administrativos", totals.total_admin],
    ["(6) IVA", totals.total_iva],
  ];
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    body: summary.map(([l, v]) => [l, fmtEur(v)]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 2;

  // Custo total banner
  doc.setFillColor(...TEAL);
  doc.roundedRect(margin, cursorY, pageW - margin * 2, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255);
  doc.text("CUSTO TOTAL DA OBRA", margin + 4, cursorY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(220);
  doc.text("(1) + (2) + (3) + (4) + (5) + (6)", margin + 4, cursorY + 10.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255);
  doc.text(fmtEur(totals.custo_total), pageW - margin - 4, cursorY + 9, { align: "right" });
  cursorY += 18;

  // Footer pagination pass
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const fname = `${docTitle.replace(/\s+/g, "_")}_${sheetCode}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
  doc.save(fname);
}
