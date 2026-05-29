// MCE — Exportação PDF e XLSX (Mod. 03-1)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  MCE_CATEGORY_LABELS,
  MCE_STATUS_LABELS,
  type MceMap,
  type MceSupplier,
  type MceItem,
  type MceSupplierItemPrice,
} from '@/types/mce';

export interface MCEExportData {
  map: MceMap;
  suppliers: MceSupplier[];
  items: MceItem[];
  prices: MceSupplierItemPrice[];
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-PT') : '—');

const priceOf = (prices: MceSupplierItemPrice[], itemId: string, supId: string) =>
  prices.find((p) => p.mce_item_id === itemId && p.mce_supplier_id === supId)?.unit_price ?? 0;

// ============================================================
// PDF — replica visual do Excel Mod. 03-1
// ============================================================
export function exportMCEtoPDF(data: MCEExportData) {
  const { map, suppliers, items, prices } = data;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 8;

  // Header
  doc.setFillColor(15, 76, 92);
  doc.rect(8, y, pageW - 16, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MCE — Mapa Comparativo Económico', 12, y + 9);
  doc.setFontSize(8);
  doc.text(`Mod. 03-1`, pageW - 12, y + 9, { align: 'right' });
  y += 18;

  // Metadata grid
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold' },
    body: [
      [
        { content: 'Nº Obra', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        map.work_number ?? '—',
        { content: 'Lote', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        map.work_lot ?? '—',
        { content: 'Nº MCE', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        map.mce_number ?? '—',
        { content: 'Categoria', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        map.category ? MCE_CATEGORY_LABELS[map.category] : '—',
      ],
      [
        { content: 'Nome da Obra', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: map.work_name ?? '—', colSpan: 3 },
        { content: 'Gestor', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: map.project_manager_name ?? '—', colSpan: 3 },
      ],
      [
        { content: 'Local', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: map.work_location ?? '—', colSpan: 3 },
        { content: 'Ref. Contratual', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: map.contractual_reference ?? '—', colSpan: 3 },
      ],
      [
        { content: 'Fornecimento', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        fmtDate(map.date_fornecimento),
        { content: 'Contrato', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        fmtDate(map.date_contrato),
        { content: 'Comparativo', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        fmtDate(map.date_comparativo),
        { content: 'Estado', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        MCE_STATUS_LABELS[map.status],
      ],
    ],
  });
  // @ts-expect-error jsPDF autoTable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 2;

  // Legend
  doc.setFontSize(6);
  doc.setTextColor(90, 90, 90);
  doc.text(
    'REFERÊNCIA CONTRATUAL: [SUB] Subempreitadas · [SRV] Prestação de Serviços · [MAT] Fornecimentos · [M.O.] Mão de Obra · [INS] Instalações Especiais · [ALU] Equipamentos/Alugueres',
    10, y + 3,
  );
  y += 6;

  // Suppliers info block
  const supHead = ['Fornecedor / Subempreiteiro', 'Contacto', 'Telemóvel', 'Email', 'NIF', 'Alvará'];
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 76, 92], textColor: 255 },
    head: [supHead],
    body: suppliers.map((s) => [
      (s.is_selected ? '★ ' : '') + (s.supplier_name_snapshot ?? '—'),
      s.contact_person ?? '—',
      s.phone ?? '—',
      s.email ?? '—',
      s.nif ?? '—',
      s.license_number ?? '—',
    ]),
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 3;

  // Comparativo
  const compHead: any[] = [
    [
      { content: 'Especificação', rowSpan: 2 },
      { content: 'Qt.', rowSpan: 2 },
      { content: 'Un', rowSpan: 2 },
      ...suppliers.map((s) => ({
        content: (s.is_selected ? '★ ' : '') + (s.supplier_name_snapshot ?? '—'),
        colSpan: 2,
        styles: { halign: 'center' },
      })),
      { content: 'Orçamento SECO', colSpan: 2, styles: { halign: 'center', fillColor: [230, 230, 230] } },
    ],
    [
      ...suppliers.flatMap(() => [
        { content: 'P.Unit.', styles: { halign: 'right' } },
        { content: 'Total', styles: { halign: 'right' } },
      ]),
      { content: 'P.Unit.', styles: { halign: 'right', fillColor: [230, 230, 230] } },
      { content: 'Total', styles: { halign: 'right', fillColor: [230, 230, 230] } },
    ],
  ];

  // Lowest per row
  const compBody = items
    .filter((it) => !it.excluded)
    .map((it) => {
      const supTotals = suppliers.map((s) => ({
        sup: s,
        up: priceOf(prices, it.id, s.id),
        total: priceOf(prices, it.id, s.id) * (it.quantity || 0),
      }));
      const validTotals = supTotals.filter((s) => s.total > 0).map((s) => s.total);
      const lowest = validTotals.length ? Math.min(...validTotals) : 0;
      const row: any[] = [
        it.specification ?? '',
        fmtNum(it.quantity),
        it.unit ?? '',
      ];
      supTotals.forEach((st) => {
        const isLow = lowest > 0 && st.total === lowest;
        row.push({ content: st.up ? fmtNum(st.up) : '—', styles: { halign: 'right' } });
        row.push({
          content: st.total ? fmtEUR(st.total) : '—',
          styles: {
            halign: 'right',
            textColor: isLow ? [0, 128, 0] : [0, 0, 0],
            fontStyle: isLow ? 'bold' : 'normal',
          },
        });
      });
      row.push({ content: fmtNum(it.dry_budget_unit_price), styles: { halign: 'right', fillColor: [245, 245, 245] } });
      row.push({ content: fmtEUR(it.dry_budget_total), styles: { halign: 'right', fillColor: [245, 245, 245] } });
      return row;
    });

  // Footer totals
  const lowestSupTotal = (() => {
    const tots = suppliers.map((s) => s.proposal_total).filter((v) => v > 0);
    return tots.length ? Math.min(...tots) : 0;
  })();
  const footRow: any[] = [
    { content: 'TOTAL (s/IVA)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220] } },
  ];
  suppliers.forEach((s) => {
    const isLow = lowestSupTotal > 0 && s.proposal_total === lowestSupTotal;
    footRow.push({ content: '', styles: { fillColor: [220, 220, 220] } });
    footRow.push({
      content: fmtEUR(s.proposal_total),
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fillColor: [220, 220, 220],
        textColor: isLow ? [0, 128, 0] : [0, 0, 0],
      },
    });
  });
  footRow.push({ content: '', styles: { fillColor: [220, 220, 220] } });
  footRow.push({ content: fmtEUR(map.dry_budget_total), styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220] } });

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: { fillColor: [15, 76, 92], textColor: 255, fontSize: 7 },
    head: compHead,
    body: [...compBody, footRow],
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 3;

  // Verba (Ganho/Perda)
  if (y > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    y = 10;
  }
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    body: [
      [
        { content: 'Orçamento Entregue (s/IVA)', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: fmtEUR(map.dry_budget_total), styles: { halign: 'right' } },
        { content: 'Adjudicado', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: fmtEUR(map.awarded_value || map.selected_supplier_total), styles: { halign: 'right' } },
        { content: 'VERBA (Ganho/Perda)', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        {
          content: `${fmtEUR(map.gain_loss_value)}  (${(map.gain_loss_percentage * 100).toFixed(2)}%)`,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            textColor: map.gain_loss_value >= 0 ? [0, 128, 0] : [200, 0, 0],
          },
        },
      ],
    ],
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4;

  // Conditions per supplier
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 76, 92], textColor: 255 },
    head: [['Fornecedor', 'C. Pagamento', 'Retenção', 'Observações Comerciais']],
    body: suppliers.map((s) => [
      (s.is_selected ? '★ ' : '') + (s.supplier_name_snapshot ?? '—'),
      s.payment_terms ?? '—',
      s.retention ?? '—',
      s.commercial_observations ?? '—',
    ]),
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4;

  // Tech requirements + observations
  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 10;
  }
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 76, 92], textColor: 255 },
    head: [['Requisitos Técnicos / Qualidade', 'Observações']],
    body: [[map.technical_requirements ?? '—', map.observations ?? '—']],
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4;

  // Signatures block
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 6, minCellHeight: 18 },
    headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
    head: [['Gestor de Obra', 'Direção Geral', 'Financeiro', 'Administração']],
    body: [['', '', '', '']],
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Mod. 03-1 · MCE ${map.mce_number ?? ''} · ${i}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 4,
      { align: 'center' },
    );
  }

  const fname = `MCE_${map.mce_number || map.id.slice(0, 8)}_${map.work_name || 'obra'}.pdf`
    .replace(/[^a-zA-Z0-9_\-.]/g, '_');
  doc.save(fname);
}

// ============================================================
// XLSX — estrutura compatível com o template original
// ============================================================
export function exportMCEtoXLSX(data: MCEExportData) {
  const { map, suppliers, items, prices } = data;
  const wb = XLSX.utils.book_new();

  // --- Folha 1: Comparativo ---
  const aoa: (string | number | null)[][] = [];
  aoa.push(['MCE — MAPA COMPARATIVO ECONÓMICO', '', '', '', '', '', '', '', 'Mod. 03-1']);
  aoa.push([]);
  aoa.push(['Nº Obra', map.work_number, 'Lote', map.work_lot, 'Nº MCE', map.mce_number, 'Categoria', map.category]);
  aoa.push(['Nome da Obra', map.work_name, '', '', 'Gestor', map.project_manager_name]);
  aoa.push(['Local', map.work_location, '', '', 'Ref. Contratual', map.contractual_reference]);
  aoa.push([
    'Fornecimento', map.date_fornecimento,
    'Contrato', map.date_contrato,
    'Comparativo', map.date_comparativo,
    'Estado', MCE_STATUS_LABELS[map.status],
  ]);
  aoa.push([]);

  // Header row 1
  const h1: (string | null)[] = ['Especificação', 'Quant.', 'Un'];
  suppliers.forEach((s) => {
    h1.push((s.is_selected ? '★ ' : '') + (s.supplier_name_snapshot ?? '—'));
    h1.push('');
  });
  h1.push('Orçamento SECO', '');
  aoa.push(h1);

  const h2: string[] = ['', '', ''];
  suppliers.forEach(() => h2.push('P.Unit.', 'Total'));
  h2.push('P.Unit.', 'Total');
  aoa.push(h2);

  items
    .filter((it) => !it.excluded)
    .forEach((it) => {
      const row: (string | number | null)[] = [it.specification ?? '', it.quantity, it.unit ?? ''];
      suppliers.forEach((s) => {
        const up = priceOf(prices, it.id, s.id);
        row.push(up || null);
        row.push(up ? up * (it.quantity || 0) : null);
      });
      row.push(it.dry_budget_unit_price || null);
      row.push(it.dry_budget_total || null);
      aoa.push(row);
    });

  // Totals row
  const totRow: (string | number | null)[] = ['TOTAL (s/IVA)', '', ''];
  suppliers.forEach((s) => {
    totRow.push('');
    totRow.push(s.proposal_total);
  });
  totRow.push('');
  totRow.push(map.dry_budget_total);
  aoa.push(totRow);

  aoa.push([]);
  aoa.push(['Orçamento Entregue', map.dry_budget_total, 'Adjudicado', map.awarded_value || map.selected_supplier_total]);
  aoa.push(['VERBA (Ganho/Perda)', map.gain_loss_value, '%', map.gain_loss_percentage]);

  aoa.push([]);
  aoa.push(['Requisitos Técnicos / Qualidade']);
  aoa.push([map.technical_requirements ?? '']);
  aoa.push([]);
  aoa.push(['Observações']);
  aoa.push([map.observations ?? '']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 40 }, { wch: 10 }, { wch: 6 },
    ...suppliers.flatMap(() => [{ wch: 12 }, { wch: 14 }]),
    { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');

  // --- Folha 2: Fornecedores ---
  const supAoa: (string | number | null)[][] = [
    ['Fornecedor', 'Contacto', 'Telemóvel', 'Email', 'NIF', 'Alvará', 'C. Pagamento', 'Retenção', 'Total Proposta', 'Selecionado'],
  ];
  suppliers.forEach((s) => {
    supAoa.push([
      s.supplier_name_snapshot ?? '',
      s.contact_person ?? '',
      s.phone ?? '',
      s.email ?? '',
      s.nif ?? '',
      s.license_number ?? '',
      s.payment_terms ?? '',
      s.retention ?? '',
      s.proposal_total,
      s.is_selected ? 'Sim' : 'Não',
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(supAoa);
  ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Fornecedores');

  const fname = `MCE_${map.mce_number || map.id.slice(0, 8)}_${map.work_name || 'obra'}.xlsx`
    .replace(/[^a-zA-Z0-9_\-.]/g, '_');
  XLSX.writeFile(wb, fname);
}
