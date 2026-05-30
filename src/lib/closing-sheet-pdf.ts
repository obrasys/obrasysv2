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
    doc.text(company.empresa_nome || "-", M + 20, 14);

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

  // H1 - título de secção
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

  // H2 - subtítulo
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
    ["Nome da Obra", details.header.nome_obra || "-"],
    ["Nº / Lote", details.header.numero_lote || "-"],
    ["Designação", details.header.designacao || "-"],
    ["Dono de Obra", details.header.dono_obra || "-"],
    ["Regime", details.header.regime_empreitada || "-"],
    ["Tipo de Obra", details.header.tipo_obra || "-"],
    ["Localização", details.header.localizacao || "-"],
    ["Prazo (meses)", String(details.header.prazo_meses ?? "-")],
    ["Nº Frações", String(details.header.num_fraccoes ?? "-")],
    ["Proj. Arquitectura", details.header.proj_arquitectura || "-"],
    ["Proj. Engenharia", details.header.proj_engenharia || "-"],
    ["Responsável Orçamento", details.header.responsavel_orcamento || "-"],
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
        l.empresa || "-",
        totals.total_directos > 0 ? `${((l.value / totals.total_directos) * 100).toFixed(1)}%` : "-",
        fmtEur(l.value),
      ]),
    foot: [["Subtotal A · Custos Directos", "", "", fmtEur(totals.total_directos)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
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
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // (1) Custo Industrial = A + B  - destaque
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

  // (2) Terreno - detalhado
  h2("(2) Terreno");
  const t = details.terrain;
  const base = t.preco_aquisicao || 0;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Rubrica", "Base / Taxa", "Valor"]],
    body: [
      ["Preço de Aquisição", "-", fmtEur(base)],
      ["Custo de Loteamento", "-", fmtEur(t.custo_loteamento || 0)],
      [`IMT (${fmtPct(t.taxa_imt_pct)})`, fmtEur(base), fmtEur(base * (t.taxa_imt_pct || 0))],
      [`Imposto de Selo (${fmtPct(t.imposto_selo_pct)})`, fmtEur(base), fmtEur(base * (t.imposto_selo_pct || 0))],
      [`Notário / Registos (${fmtPct(t.custos_notario_pct)})`, fmtEur(base), fmtEur(base * (t.custos_notario_pct || 0))],
      ["Comissões intermediários", "-", fmtEur(t.comissoes_intermediarios || 0)],
      ["Ensaios geotécnicos", "-", fmtEur(t.ensaios_geotecnicos || 0)],
      ["Levantamento topográfico", "-", fmtEur(t.levantamento_topografico || 0)],
      ["Demolições diversas", "-", fmtEur(t.demolicoes_diversas || 0)],
      ["Arranjos exteriores", "-", fmtEur(t.arranjos_exteriores || 0)],
    ],
    foot: [["Subtotal (2) Terreno", "", fmtEur(totals.total_terreno)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right", cellWidth: 35 }, 2: { halign: "right", cellWidth: 40 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // (3) Indirectos - detalhado
  h2("(3) Custos Indirectos");
  const ind = details.indirect;
  const ci = totals.custo_industrial;
  const cd = totals.total_directos;
  const vv = totals.valor_vendas;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Rubrica", "Base / Taxa", "Valor"]],
    body: [
      (() => {
        const pct = ind.honorarios_tecnicos_pct;
        const val = pct != null ? cd * (pct || 0) : (ind.honorarios_tecnicos || 0);
        return pct != null
          ? [`Honorários Técnicos (${fmtPct(pct)} s/ constr.)`, fmtEur(cd), fmtEur(val)]
          : ["Honorários Técnicos", "-", fmtEur(val)];
      })(),
      [`Custos de Seguros (${fmtPct(ind.seguros_pct || 0)} s/ constr.)`, fmtEur(cd), fmtEur(cd * (ind.seguros_pct || 0))],
      (() => {
        const pct = ind.financeiros_pct;
        const val = pct != null ? cd * (pct || 0) : (ind.financeiros || 0);
        return pct != null
          ? [`Custos Financeiros (${fmtPct(pct)} s/ constr.)`, fmtEur(cd), fmtEur(val)]
          : ["Custos Financeiros", "-", fmtEur(val)];
      })(),
      [`Taxas - Impostos - Encargos Prediais (${fmtPct(ind.taxas_impostos_prediais_pct || 0)} s/ constr.)`, fmtEur(cd), fmtEur(cd * (ind.taxas_impostos_prediais_pct || 0))],
      [`Publicidade / Marketing (${fmtPct(ind.publicidade_marketing_vendas_pct || 0)} s/ Vendas)`, fmtEur(vv), fmtEur(vv * (ind.publicidade_marketing_vendas_pct || 0))],
      [`Honorários de Gestão e Custos Anexos (${fmtPct(ind.honorarios_gestao_vendas_pct || 0)} s/ Vendas)`, fmtEur(vv), fmtEur(vv * (ind.honorarios_gestao_vendas_pct || 0))],
      [`Honorários de Comercialização (${fmtPct(ind.honorarios_comercializacao_vendas_pct || 0)} s/ Vendas)`, fmtEur(vv), fmtEur(vv * (ind.honorarios_comercializacao_vendas_pct || 0))],
      [`Garantias / Pós-Venda (${fmtPct(ind.garantias_pos_venda_vendas_pct || 0)} s/ Vendas)`, fmtEur(vv), fmtEur(vv * (ind.garantias_pos_venda_vendas_pct || 0))],
    ],

    foot: [["Subtotal (3) Indirectos", "", fmtEur(totals.total_indirectos)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right", cellWidth: 35 }, 2: { halign: "right", cellWidth: 40 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // (4) Outros - detalhado
  h2("(4) Outros Custos");
  const o = details.other;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Rubrica", "Base / Taxa", "Valor"]],
    body: [
      [`Projectos Arq.+Esp. (${fmtPct(o.projectos_pct)})`, fmtEur(totals.total_directos), fmtEur(totals.total_directos * (o.projectos_pct || 0))],
      o.contratos_registos_vendas_pct !== undefined && o.contratos_registos_vendas_pct !== null
        ? [`Contratos / Registos (${fmtPct(o.contratos_registos_vendas_pct)} s/ Vendas)`, fmtEur(totals.valor_vendas), fmtEur((totals.valor_vendas || 0) * (o.contratos_registos_vendas_pct || 0))]
        : ["Contratos e Registos", "-", fmtEur(o.contratos_registos || 0)],
      [`Imprevistos / Áleas (${fmtPct(o.imprevistos_aleas_pct)} s/ C.Industrial)`, fmtEur(ci), fmtEur(ci * (o.imprevistos_aleas_pct || 0))],
      o.outros_taxas_ramais_pct !== undefined && o.outros_taxas_ramais_pct !== null
        ? [`Outros (Taxas, Ramais...) (${fmtPct(o.outros_taxas_ramais_pct)} s/ constr.)`, fmtEur(totals.total_directos), fmtEur(totals.total_directos * (o.outros_taxas_ramais_pct || 0))]
        : ["Outras taxas / Ramais", "-", fmtEur(o.outros_taxas_ramais || 0)],
      ["Controlo Qualidade / Certificações", "-", fmtEur(o.controlo_qualidade || 0)],
      ["Segurança & Higiene", "-", fmtEur(o.seguranca_higiene || 0)],
    ],
    foot: [["Subtotal (4) Outros", "", fmtEur(totals.total_outros)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right", cellWidth: 35 }, 2: { halign: "right", cellWidth: 40 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // (5) Administrativos
  h2("(5) Custos Administrativos");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Rubrica", "Valor"]],
    body: [
      ["Custos Estrutura / Fixos (Overhead) (% s/ Vendas)", fmtEur((totals.valor_vendas || 0) * (details.admin.estrutura_overhead_vendas_pct ?? 0))],
      ["Fee Gestão Inter-Grupo (% s/ Vendas)", fmtEur((totals.valor_vendas || 0) * (details.admin.fee_inter_grupo_vendas_pct ?? 0))],
      ["Outros Custos Administrativos (% s/ Vendas)", fmtEur((totals.valor_vendas || 0) * (details.admin.outros_administrativos_vendas_pct ?? 0))],
    ],
    foot: [["Subtotal (5) Administrativos", fmtEur(totals.total_admin)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right", cellWidth: 48 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // (6) IVA - detalhado
  h2("(6) IVA");
  const baseIvaTerrenoHon =
    (details.terrain.custo_loteamento || 0) +
    (details.terrain.ensaios_geotecnicos || 0) +
    (details.terrain.comissoes_intermediarios || 0) +
    (details.terrain.levantamento_topografico || 0) +
    (details.terrain.demolicoes_diversas || 0) +
    (details.terrain.arranjos_exteriores || 0);
  const ivaTerr = baseIvaTerrenoHon * (details.iva.taxa_terreno_pct || 0);
  const ivaCon = totals.base_iva_construcao * (details.iva.taxa_construcao_pct || 0);
  const ivaHon = (totals.total_indirectos + totals.total_admin) * (details.iva.taxa_honorarios_pct || 0);
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Componente", "Base", "Taxa", "Valor"]],
    body: [
      [
        `Honorários Terreno / Arranjos Exteriores`,
        fmtEur(baseIvaTerrenoHon),
        fmtPct(details.iva.taxa_terreno_pct),
        fmtEur(ivaTerr),
      ],
      ["Construção", fmtEur(totals.base_iva_construcao), fmtPct(details.iva.taxa_construcao_pct), fmtEur(ivaCon)],
      ["Honorários / Indirectos", fmtEur(totals.total_indirectos + totals.total_admin), fmtPct(details.iva.taxa_honorarios_pct), fmtEur(ivaHon)],
    ],
    foot: [["Subtotal (6) IVA", "", "", fmtEur(totals.total_iva)]],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    footStyles: { fillColor: TEAL_SOFT, textColor: INK, fontStyle: "bold", fontSize: FS.body },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", cellWidth: 32 } },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Custo Total da Obra - banner final
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
        l.tipologia || "-",
        String(l.quantidade),
        String(l.area_priv),
        fmtEur(l.preco_m2),
        fmtEur((l.quantidade || 0) * (l.area_priv || 0) * (l.preco_m2 || 0)),
      ]),
      foot: [["Valor Estimado de Vendas", "", "", "", fmtEur(totals.valor_vendas)]],
      theme: "striped",
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
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
  // 4) CONTROLO ECONÓMICO - só após termos custos e vendas
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
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 2 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 55 } },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // =========================================================
  // 5) ÁREAS ESTATÍSTICAS
  // =========================================================
  h1("5. Áreas Estatísticas");
  const st = details.statistics;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Área", "Valor (m²)", "Factor", "Área equivalente"]],
    body: [
      ["Construção (ABP)", String(st.area_construcao || 0), "1,00", (st.area_construcao || 0).toFixed(2)],
      ["Caves", String(st.area_caves || 0), st.factor_caves.toFixed(2).replace(".", ","),
        ((st.area_caves || 0) * (st.factor_caves || 0)).toFixed(2)],
      ["Arranjos Exteriores", String(st.area_arranjos_ext || 0), st.factor_arranjos.toFixed(2).replace(".", ","),
        ((st.area_arranjos_ext || 0) * (st.factor_arranjos || 0)).toFixed(2)],
    ],
    theme: "striped",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
    styles: { fontSize: FS.body, textColor: INK },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // =========================================================
  // 6) CONDICIONANTES
  // =========================================================
  const c = details.conditions;
  const condRows: [string, string][] = [
    ["Estudo geotécnico", c.estudo_geotecnico ? "Sim" : "Não"],
    ["Zona urbana", c.zona_urbana ? "Sim" : "Não"],
    ["Acessos", c.acessos ? "Sim" : "Não"],
    ["Energia eléctrica", c.energia_electrica ? "Sim" : "Não"],
    ["Canalização de água", c.canalizacao_agua ? "Sim" : "Não"],
    ["Fundações indirectas", c.fundacoes_indirectas ? "Sim" : "Não"],
    ["Rebaixamento freático", c.rebaixamento_freatico ? "Sim" : "Não"],
    ["Condições de estaleiro", c.condicoes_estaleiro ? "Sim" : "Não"],
    ["Ocupação via pública", c.ocupacao_via_publica ? "Sim" : "Não"],
  ];
  h1("6. Condicionantes");
  const condPaired: string[][] = [];
  for (let i = 0; i < condRows.length; i += 3) {
    condPaired.push([
      condRows[i][0], condRows[i][1],
      condRows[i + 1]?.[0] || "", condRows[i + 1]?.[1] || "",
      condRows[i + 2]?.[0] || "", condRows[i + 2]?.[1] || "",
    ]);
  }
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: condPaired,
    theme: "plain",
    styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.4 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED }, 1: {},
      2: { fontStyle: "bold", textColor: MUTED }, 3: {},
      4: { fontStyle: "bold", textColor: MUTED }, 5: {},
    },
  });
  y = (doc as any).lastAutoTable.finalY + 3;
  if (c.observacoes) {
    h2("Observações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS.body);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(c.observacoes, pageW - M * 2);
    ensureSpace(wrapped.length * 4 + 2);
    doc.text(wrapped, M, y);
    y += wrapped.length * 4 + 3;
  }

  // =========================================================
  // 7) ESPECIFICAÇÕES TÉCNICAS / QUALIDADES
  // =========================================================
  const qsEntries = Object.entries(details.quality_specs_values || {}).filter(([, v]) => v && v.trim());
  if (qsEntries.length > 0) {
    h1("7. Especificações Técnicas / Qualidades");
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Rúbrica", "Especificação"]],
      body: qsEntries.map(([k, v]) => [k, v]),
      theme: "striped",
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: FS.body, fontStyle: "bold" },
      styles: { fontSize: FS.body, textColor: INK },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // =========================================================
  // 8) PROPOSTA VENDAS sobre o CUSTO TOTAL DA OBRA
  // =========================================================
  const v = details.validation;
  const a = details.approvals;
  const custoTotal = Number(totals.custo_total) || 0;
  const abpFromSales = details.sales.reduce(
    (s, l) => s + (Number(l.quantidade) || 0) * (Number(l.area_priv) || 0),
    0,
  );
  const abpEffective = details.statistics.area_construcao_override
    ? (details.statistics.area_construcao || 0)
    : abpFromSales;
  const numFraccoes =
    Number(details.header.num_fraccoes) ||
    details.sales.reduce((s, l) => s + (Number(l.quantidade) || 0), 0);

  const lucroDgPct = Number(v.percentagem_lucro_alvo) || 0;
  const lucroAdmPct = Number(a.percentagem_lucro_admin ?? lucroDgPct) || 0;
  const calcPV = (pct: number) => (pct < 1 ? custoTotal / (1 - pct) : 0);
  const pvDg = calcPV(lucroDgPct);
  const pvAdm = calcPV(lucroAdmPct);

  h1("8. Proposta Vendas sobre o Custo Total da Obra");

  const drawPropostaRow = (
    label: string,
    subLabel: string,
    pct: number,
    pv: number,
    nome?: string | null,
    data?: string | null,
  ) => {
    const rowH = 26;
    ensureSpace(rowH + 2);
    const wPct = 32;
    const wMid = pageW - M * 2 - wPct - 56 - 4;
    const wRight = 56;
    const xPct = M;
    const xMid = M + wPct + 2;
    const xRight = xMid + wMid + 2;

    // % Lucro
    doc.setFillColor(255, 247, 224);
    doc.setDrawColor(245, 196, 90);
    doc.roundedRect(xPct, y, wPct, rowH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.micro); doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), xPct + wPct / 2, y + 4, { align: "center" });
    doc.setFontSize(FS.micro); doc.setTextColor(160, 110, 30);
    doc.text("% LUCRO", xPct + wPct / 2, y + 10, { align: "center" });
    doc.setFontSize(FS.h1 + 1); doc.setTextColor(120, 80, 20);
    doc.text(`${(pct * 100).toFixed(2).replace(".", ",")}%`, xPct + wPct / 2, y + 19, { align: "center" });

    // Valor proposta
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(220);
    doc.roundedRect(xMid, y, wMid, rowH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "italic"); doc.setFontSize(FS.micro); doc.setTextColor(...MUTED);
    doc.text(subLabel, xMid + wMid / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.h1 + 3); doc.setTextColor(...TEAL);
    doc.text(fmtEur(pv), xMid + wMid / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.micro); doc.setTextColor(...INK);
    doc.text(`Ass.: ${nome || "_______________"}`, xMid + 3, y + 22);
    doc.text(`Data: ${data || "____ / ____ / ______"}`, xMid + wMid - 3, y + 22, { align: "right" });

    // €/m² e €/un
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(220);
    doc.roundedRect(xRight, y, wRight, rowH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "italic"); doc.setFontSize(FS.micro); doc.setTextColor(...MUTED);
    doc.text("Valor Médio / fração", xRight + wRight - 3, y + 4, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body + 1); doc.setTextColor(...INK);
    doc.text(`${fmtEur(abpEffective > 0 ? pv / abpEffective : 0)} /m²`, xRight + wRight - 3, y + 13, { align: "right" });
    doc.text(`${fmtEur(numFraccoes > 0 ? pv / numFraccoes : 0)} /un`, xRight + wRight - 3, y + 21, { align: "right" });

    y += rowH + 3;
  };

  drawPropostaRow("Direção Geral", "Validação Técnico-Económica", lucroDgPct, pvDg, v.direccao_geral, a.aprovacao_inicial_data);
  drawPropostaRow("Administração", "Aprovação Inicial", lucroAdmPct, pvAdm, a.administracao_nome, a.administracao_data);

  // Validador + Observações
  if (v.validador_tecnico_economico || v.observacoes || a.notas) {
    autoTable(doc, {
      startY: y + 1,
      margin: { left: M, right: M },
      body: [
        ["Validador Técnico-Económico", v.validador_tecnico_economico || "-"],
        ...(v.observacoes ? [["Observações", v.observacoes]] : []),
        ...(a.notas ? [["Notas Administração", a.notas]] : []),
      ],
      theme: "plain",
      styles: { fontSize: FS.body, textColor: INK, cellPadding: 1.6 },
      columnStyles: { 0: { fontStyle: "bold", textColor: MUTED, cellWidth: 55 }, 1: {} },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }


  // Rodapés
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const fname = `${docTitle.replace(/\s+/g, "_")}_${sheetCode}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
  doc.save(fname);
}
