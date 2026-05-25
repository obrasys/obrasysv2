import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { ClosingSheet } from "@/hooks/useClosingSheets";
import type { ClosingSheetDetails, ClosingTotals } from "@/types/closing-sheet";

// Paleta
const TEAL: [number, number, number] = [15, 76, 92];
const TEAL_SOFT: [number, number, number] = [232, 240, 242];
const MUTED: [number, number, number] = [115, 115, 115];
const LIGHT: [number, number, number] = [245, 247, 248];
const INK: [number, number, number] = [25, 25, 25];

// Hierarquia tipográfica
// H1 título de secção: bold 12  | H2 subtítulo: bold 9  | Body: normal 8
const FS = { h1: 12, h2: 9, body: 8, micro: 7 } as const;

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
  const M = 14; // margem

  const logoData = await loadLogo(company.empresa_logo_url);

  // ===== Cabeçalho =====
  const drawHeader = () => {
    if (logoData) {
      try { doc.addImage(logoData, "PNG", M, 10, 16, 16); } catch { /* */ }
    } else {
      doc.setDrawColor(220); doc.rect(M, 10, 16, 16);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.h2);
    doc.setTextColor(...INK);
    doc.text(company.empresa_nome || "—", M + 20, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS.micro);
    doc.setTextColor(...MUTED);
    const meta: string[] = [];
    if (company.empresa_nif) meta.push(`NIF: ${company.empresa_nif}`);
    if (company.empresa_morada) meta.push(company.empresa_morada);
    const contact = [company.empresa_telefone, company.empresa_email].filter(Boolean).join(" · ");
    if (contact) meta.push(contact);
    meta.forEach((l, i) => doc.text(l, M + 20, 18 + i * 3.2));

    // Direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.h2);
    doc.setTextColor(...TEAL);
    doc.text(docTitle.toUpperCase(), pageW - M, 14, { align: "right" });
    doc.setFont("courier", "bold");
    doc.setFontSize(FS.body);
    doc.setTextColor(...INK);
    doc.text(sheetCode, pageW - M, 18.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS.micro);
    doc.setTextColor(...MUTED);
    doc.text(
      `Emitido ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })}`,
      pageW - M, 22.5, { align: "right" },
    );

    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.4);
    doc.line(M, 29, pageW - M, 29);
  };

  const drawFooter = (n: number, total: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS.micro);
    doc.setTextColor(...MUTED);
    doc.text(sheetCode, M, pageH - 8);
    doc.text(`${docTitle} · ${company.empresa_nome || ""}`, pageW / 2, pageH - 8, { align: "center" });
    doc.text(`Página ${n} de ${total}`, pageW - M, pageH - 8, { align: "right" });
  };

  let y = 36;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - 16) {
      doc.addPage();
      drawHeader();
      y = 36;
    }
  };

  // H1 — título de secção
  const h1 = (label: string) => {
    ensureSpace(12);
    doc.setFillColor(...TEAL);
    doc.rect(M, y, 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.h1);
    doc.setTextColor(...TEAL);
    doc.text(label.toUpperCase(), M + 5, y + 5.3);
    y += 9;
  };

  // H2 — subtítulo
  const h2 = (label: string) => {
    ensureSpace(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.h2);
    doc.setTextColor(...INK);
    doc.text(label, M, y + 3.5);
    y += 5.5;
  };

  drawHeader();

  // =========================================================
  // 1) DADOS DA OBRA
  // =========================================================
  h1("1. Dados da Obra");
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
  const pairedRows: string[][] = [];
  for (let i = 0; i < headerRows.length; i += 2) {
    pairedRows.push([
      headerRows[i][0], headerRows[i][1],
      headerRows[i + 1]?.[0] || "", headerRows[i + 1]?.[1] || "",
    ]);
  }
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: pairedRows,
    theme: "plain",
    styles: { fontSize: FS.body, cellPadding: 1.4, textColor: INK },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED, cellWidth: 38 },
      1: { cellWidth: 52 },
      2: { fontStyle: "bold", textColor: MUTED, cellWidth: 38 },
      3: { cellWidth: 52 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // =========================================================
  // 2) ESTRUTURA DE CUSTOS  (sequencial: A → B → … → Total)
  // =========================================================
  h1("2. Estrutura de Custos");

  // 2.A Custos Directos
  h2("A · Custos Directos (s/ IVA)");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Rubrica", "Empresa", "% s/ A", "Valor"]],
    body: details.direct_costs
      .filter((l) => l.value > 0)
      .map((l) => [
        l.label,
        l.empresa || "—",
        totals.total_directos > 0 ? `${((l.value / totals.total_directos) * 100).toFixed(1)}%` : "—",
        fmtEur(l.value),
      ]),
    foot: [["Subtotal A · Custos Directos", "", "", fmtEur(totals.total_directos)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right", cellWidth: 32 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // 2.B Custos de Estaleiro
  h2("B · Custos de Estaleiro");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Rubrica", "Valor"]],
    body: details.site_costs.filter((l) => l.value > 0).map((l) => [l.label, fmtEur(l.value)]),
    foot: [["Subtotal B · Custos de Estaleiro", fmtEur(totals.total_estaleiro)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // (1) Custo Industrial = A + B  — destaque
  ensureSpace(14);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, pageW - M * 2, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS.h2);
  doc.setTextColor(...INK);
  doc.text("(1) Custo Industrial  =  A + B", M + 3, y + 7);
  doc.setFontSize(FS.h2);
  doc.setTextColor(...TEAL);
  doc.text(fmtEur(totals.custo_industrial), pageW - M - 3, y + 7, { align: "right" });
  y += 15;

  // (2) Terreno
  h2("(2) Terreno");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [["Total Terreno", fmtEur(totals.total_terreno)]],
    theme: "plain",
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // (3) Indirectos
  h2("(3) Custos Indirectos");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [["Total Indirectos", fmtEur(totals.total_indirectos)]],
    theme: "plain",
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // (4) Outros
  h2("(4) Outros Custos");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [["Total Outros", fmtEur(totals.total_outros)]],
    theme: "plain",
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // (5) Administrativos
  h2("(5) Custos Administrativos");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [["Total Administrativos", fmtEur(totals.total_admin)]],
    theme: "plain",
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // (6) IVA
  h2("(6) IVA");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [["Total IVA", fmtEur(totals.total_iva)]],
    theme: "plain",
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Custo Total da Obra — banner final
  ensureSpace(18);
  doc.setFillColor(...TEAL);
  doc.roundedRect(M, y, pageW - M * 2, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS.h1);
  doc.setTextColor(255, 255, 255);
  doc.text("CUSTO TOTAL DA OBRA", M + 4, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS.micro);
  doc.setTextColor(220, 230, 232);
  doc.text("(1) + (2) + (3) + (4) + (5) + (6)", M + 4, y + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS.h1 + 1);
  doc.setTextColor(255, 255, 255);
  doc.text(fmtEur(totals.custo_total), pageW - M - 4, y + 9.5, { align: "right" });
  y += 20;

  // =========================================================
  // 3) MAPA DE VENDAS
  // =========================================================
  if (details.sales.length > 0) {
    h1("3. Mapa de Vendas Comercial");
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Tipologia", "Quant.", "Área (m²)", "Preço m²", "Total"]],
      body: details.sales.map((l) => [
        l.tipologia || "—",
        String(l.quantidade),
        String(l.area_priv),
        fmtEur(l.preco_m2),
        fmtEur((l.quantidade || 0) * (l.area_priv || 0) * (l.preco_m2 || 0)),
      ]),
      foot: [["Valor Estimado de Vendas", "", "", "", fmtEur(totals.valor_vendas)]],
      theme: "striped",
      headStyles: { fillColor: TEAL, fontSize: FS.body, fontStyle: "bold" },
      footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
      styles: { fontSize: FS.body, textColor: INK },
      columnStyles: {
        1: { halign: "right" }, 2: { halign: "right" },
        3: { halign: "right" }, 4: { halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // =========================================================
  // 4) CONTROLO ECONÓMICO — só após termos custos e vendas
  // =========================================================
  h1("4. Controlo Económico");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Indicador", "Valor"]],
    body: [
      ["Custo Total da Obra", fmtEur(totals.custo_total)],
      ["Valor de Vendas", fmtEur(totals.valor_vendas)],
      ["Resultado Antes de Impostos (RAI €)", fmtEur(totals.rai_eur)],
      ["RAI %", fmtPct(totals.rai_pct)],
      ["K de Venda  (Vendas / Custo Industrial)", totals.k_venda.toFixed(3).replace(".", ",")],
      ["Custo / m² equivalente", fmtEur(totals.custo_m2_equivalente)],
    ],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: FS.body, fontStyle: "bold" },
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 2 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 55 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Rodapés
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const fname = `${docTitle.replace(/\s+/g, "_")}_${sheetCode}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
  doc.save(fname);
}
