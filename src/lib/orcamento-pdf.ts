import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Orcamento } from '@/types/orcamentos';
import { CAPITULO_COLUMNS, loadVisibleColumns, getCellValue, type CapituloColumnKey } from '@/lib/capitulo-columns';

interface PdfProfile {
  empresa_nome?: string | null;
  empresa?: string | null;
  nome?: string | null;
  empresa_nif?: string | null;
  nif?: string | null;
  empresa_morada?: string | null;
  empresa_codigo_postal?: string | null;
  empresa_cidade?: string | null;
  empresa_telefone?: string | null;
  telefone?: string | null;
  empresa_email?: string | null;
  email?: string | null;
  empresa_logo_url?: string | null;
  default_budget_observations?: string | null;
}

export const DEFAULT_BUDGET_OBSERVATIONS = [
  'Este orçamento é válido por 30 dias a contar da data de emissão.',
  'Os preços apresentados incluem todos os materiais e mão de obra necessários.',
  'Eventuais trabalhos adicionais não contemplados serão orçamentados separadamente.',
  'Condições de pagamento a acordar.',
].join('\n');

interface PdfOptions {
  orcamento: Orcamento;
  profile: PdfProfile | null;
  margemDecimal: number;
  taxaIVA: number;
  valorBase: number;
  valorIVA: number;
  valorFinal: number;
  custosIndiretosTotal: number;
  subtotalArtigos: number;
  notaLegal?: string | null;
  regimeNome?: string;
}

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],       // blue-600
  primaryLight: [219, 234, 254] as [number, number, number], // blue-100
  dark: [30, 30, 30] as [number, number, number],
  text: [55, 55, 55] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
  headerBg: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PAGE = {
  marginLeft: 15,
  marginRight: 15,
  marginTop: 18,
  marginBottom: 22,
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function getUsable(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  return {
    width: w - PAGE.marginLeft - PAGE.marginRight,
    height: h - PAGE.marginTop - PAGE.marginBottom,
    pageW: w,
    pageH: h,
  };
}

function addFooter(doc: jsPDF, companyName: string | undefined) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const { pageW, pageH } = getUsable(doc);
    const footerY = pageH - 8;

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE.marginLeft, footerY - 3, pageW - PAGE.marginRight, footerY - 3);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');

    if (companyName) {
      doc.text(companyName, PAGE.marginLeft, footerY);
    }

    doc.text(`Página ${i} de ${pages}`, pageW - PAGE.marginRight, footerY, { align: 'right' });
  }
}

function ensureSpace(doc: jsPDF, needed: number, y: number): number {
  const { pageH } = getUsable(doc);
  const maxY = pageH - PAGE.marginBottom;
  if (y + needed > maxY) {
    doc.addPage();
    return PAGE.marginTop;
  }
  return y;
}

async function loadImage(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    // Try img element approach first (handles most CORS scenarios)
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          const data = canvas.toDataURL('image/png');
          resolve({ data, width: img.naturalWidth, height: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        // Fallback: fetch as blob
        fetch(url)
          .then(r => r.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const tempImg = new Image();
              tempImg.onload = () => resolve({ data: reader.result as string, width: tempImg.naturalWidth, height: tempImg.naturalHeight });
              tempImg.onerror = () => resolve(null);
              tempImg.src = reader.result as string;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          })
          .catch(() => resolve(null));
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function generateOrcamentoPdf(options: PdfOptions): Promise<Blob> {
  const {
    orcamento,
    profile,
    margemDecimal,
    taxaIVA,
    valorBase,
    valorIVA,
    valorFinal,
    custosIndiretosTotal,
    subtotalArtigos,
    notaLegal,
    regimeNome,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { width: usableW, pageW } = getUsable(doc);

  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome || '';
  const companyNif = profile?.empresa_nif || profile?.nif;

  let y = PAGE.marginTop;

  // ─── HEADER ────────────────────────────────────────────
  // Logo
  let logoRendered = false;
  if (profile?.empresa_logo_url) {
    const logoResult = await loadImage(profile.empresa_logo_url);
    if (logoResult) {
      try {
        // Maintain aspect ratio, max height 14mm
        const maxH = 14;
        const maxW = 40;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxH * ratio;
        let logoH = maxH;
        if (logoW > maxW) { logoW = maxW; logoH = maxW / ratio; }
        doc.addImage(logoResult.data, 'PNG', PAGE.marginLeft, y, logoW, logoH);
        logoRendered = true;
      } catch { /* skip logo */ }
    }
  }

  // Company info (left)
  const infoX = logoRendered ? PAGE.marginLeft + 44 : PAGE.marginLeft;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(companyName, infoX, y + 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  let infoY = y + 8;
  if (companyNif) {
    doc.text(`NIF: ${companyNif}`, infoX, infoY);
    infoY += 3.5;
  }
  if (profile?.empresa_morada) {
    let addr = profile.empresa_morada;
    if (profile.empresa_codigo_postal) addr += `, ${profile.empresa_codigo_postal}`;
    if (profile.empresa_cidade) addr += ` ${profile.empresa_cidade}`;
    doc.text(addr, infoX, infoY);
    infoY += 3.5;
  }
  const contacts: string[] = [];
  if (profile?.empresa_telefone || profile?.telefone)
    contacts.push(`Tel: ${profile?.empresa_telefone || profile?.telefone}`);
  if (profile?.empresa_email || profile?.email)
    contacts.push(profile?.empresa_email || profile?.email || '');
  if (contacts.length) {
    doc.text(contacts.join('  •  '), infoX, infoY);
  }

  // "ORÇAMENTO" title (right)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('ORÇAMENTO', pageW - PAGE.marginRight, y + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  if (orcamento.codigo) {
    doc.text(orcamento.codigo, pageW - PAGE.marginRight, y + 10, { align: 'right' });
  }
  doc.text(
    `Data: ${format(new Date(orcamento.data_criacao), "d 'de' MMMM 'de' yyyy", { locale: pt })}`,
    pageW - PAGE.marginRight,
    y + 14,
    { align: 'right' }
  );

  y += 20;

  // Divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(PAGE.marginLeft, y, pageW - PAGE.marginRight, y);
  y += 6;

  // ─── BUDGET TITLE & CLIENT ─────────────────────────────
  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  const titleLines = doc.splitTextToSize(orcamento.titulo, usableW);
  doc.text(titleLines, PAGE.marginLeft, y);
  y += titleLines.length * 5 + 2;

  // Obra
  if (orcamento.obra?.nome) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Obra: ${orcamento.obra.nome}`, PAGE.marginLeft, y);
    y += 4;
  }

  // Client info box
  if (orcamento.cliente) {
    y += 2;
    const c = orcamento.cliente;
    doc.setFillColor(...COLORS.headerBg);
    doc.roundedRect(PAGE.marginLeft, y, usableW, 20, 1.5, 1.5, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('CLIENTE', PAGE.marginLeft + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);

    let cY = y + 5;
    const col2 = PAGE.marginLeft + usableW / 2;

    doc.setFont('helvetica', 'bold');
    doc.text(c.nome, PAGE.marginLeft + 4, cY + 4);
    doc.setFont('helvetica', 'normal');
    if (c.empresa) doc.text(c.empresa, PAGE.marginLeft + 4, cY + 8);
    if (c.nif) doc.text(`NIF: ${c.nif}`, PAGE.marginLeft + 4, cY + 12);

    if (c.endereco) {
      let addr = c.endereco;
      if (c.codigo_postal) addr += `, ${c.codigo_postal}`;
      if (c.cidade) addr += ` ${c.cidade}`;
      doc.text(addr, col2, cY + 4);
    }
    if (c.telemovel || c.telefone) {
      doc.text(`Tel: ${c.telemovel || c.telefone}`, col2, cY + 8);
    }
    if (c.email) {
      doc.text(c.email, col2, cY + 12);
    }

    y += 24;
  }

  y += 4;

  // ─── CHAPTERS & ARTICLES ──────────────────────────────
  const chapters = orcamento.capitulos || [];

  for (const cap of chapters) {
    // Check if we have space for at least the chapter header + 3 rows (~25mm)
    y = ensureSpace(doc, 25, y);

    // Chapter header bar
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(PAGE.marginLeft, y, usableW, 7, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${cap.numero}. ${cap.titulo}`, PAGE.marginLeft + 3, y + 5);
    y += 9;

    if (cap.descricao) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      const descLines = doc.splitTextToSize(cap.descricao, usableW - 6);
      doc.text(descLines, PAGE.marginLeft + 3, y);
      y += descLines.length * 3 + 2;
    }

    // Articles table
    const artigos = cap.artigos || [];
    if (artigos.length > 0) {
      const visibleKeys = loadVisibleColumns();
      const cols = CAPITULO_COLUMNS.filter((c) => visibleKeys.includes(c.key));
      const marginMultiplier = margemDecimal > 0 && margemDecimal < 1 ? 1 / (1 - margemDecimal) : 1;

      const head = [cols.map((c) => c.label)];
      const tableBody = artigos.map((art) =>
        cols.map((c) => getCellValue(art, c.key, { marginMultiplier }))
      );

      // Proportional column widths based on weights
      const totalWeight = cols.reduce((s, c) => s + c.weight, 0);
      const columnStyles: Record<number, any> = {};
      cols.forEach((c, i) => {
        columnStyles[i] = {
          cellWidth: (usableW * c.weight) / totalWeight,
          halign: c.numeric ? 'right' : c.key === 'unidade' ? 'center' : 'left',
          fontStyle: c.key === 'subtotal' ? 'bold' : 'normal',
        };
      });

      autoTable(doc, {
        startY: y,
        margin: { left: PAGE.marginLeft, right: PAGE.marginRight },
        head,
        body: tableBody,
        theme: 'grid',
        styles: {
          fontSize: cols.length > 8 ? 6.5 : 7.5,
          cellPadding: 1.6,
          textColor: COLORS.text,
          lineColor: COLORS.border,
          lineWidth: 0.2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: COLORS.headerBg,
          textColor: COLORS.dark,
          fontStyle: 'bold',
          fontSize: cols.length > 8 ? 6.5 : 7.5,
          halign: 'left',
        },
        columnStyles,
        showHead: 'everyPage',
      });

      y = (doc as any).lastAutoTable.finalY + 1;
    } else {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text('Sem artigos neste capítulo', PAGE.marginLeft + 3, y + 3);
      y += 7;
    }

    // Chapter subtotal bar - compute from articles to avoid stale cap.valor_total
    const capRaw = (cap.artigos || []).reduce(
      (acc, a) => acc + (a.valor_total ?? a.quantidade * a.preco_unitario),
      0
    );
    const capTotal = margemDecimal > 0 && margemDecimal < 1 ? capRaw / (1 - margemDecimal) : capRaw;
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(PAGE.marginLeft, y, usableW, 6, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.line(PAGE.marginLeft, y, PAGE.marginLeft + usableW, y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Subtotal Capítulo:', pageW - PAGE.marginRight - 50, y + 4);
    doc.text(fmt(capTotal), pageW - PAGE.marginRight - 3, y + 4, { align: 'right' });
    y += 10;
  }

  // ─── SUMMARY ──────────────────────────────────────────
  y = ensureSpace(doc, 55, y);

  // Divider before summary
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginLeft, y, pageW - PAGE.marginRight, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Resumo do Orçamento', PAGE.marginLeft, y);
  y += 7;

  const summaryX = pageW - PAGE.marginRight - 60;
  const summaryValX = pageW - PAGE.marginRight - 3;

  const addSummaryRow = (label: string, value: string, bold = false, indent = 0) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(bold ? COLORS.dark[0] : COLORS.text[0], bold ? COLORS.dark[1] : COLORS.text[1], bold ? COLORS.dark[2] : COLORS.text[2]);
    doc.text(label, summaryX + indent, y);
    doc.text(value, summaryValX, y, { align: 'right' });
    y += 5;
  };

  const applyM = (v: number) => margemDecimal > 0 && margemDecimal < 1 ? v / (1 - margemDecimal) : v;
  addSummaryRow('Subtotal Artigos', fmt(applyM(subtotalArtigos)));

  if (custosIndiretosTotal > 0) {
    const ci = orcamento.custos_indiretos;
    if (ci?.estaleiro > 0) addSummaryRow('Estaleiro', fmt(applyM(ci.estaleiro)), false, 4);
    if (ci?.seguros > 0) addSummaryRow('Seguros', fmt(applyM(ci.seguros)), false, 4);
    if (ci?.licenciamento > 0) addSummaryRow('Licenciamento', fmt(applyM(ci.licenciamento)), false, 4);
  }

  // Line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(summaryX, y, summaryValX, y);
  y += 4;

  addSummaryRow('Subtotal (s/ IVA)', fmt(valorBase), true);
  addSummaryRow(`IVA (${taxaIVA}%)`, fmt(valorIVA));

  // Double line before total
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(summaryX, y, summaryValX, y);
  y += 1;
  doc.line(summaryX, y, summaryValX, y);
  y += 5;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TOTAL', summaryX, y);
  doc.text(fmt(valorFinal), summaryValX, y, { align: 'right' });
  y += 10;

  // ─── OBSERVATIONS ─────────────────────────────────────
  y = ensureSpace(doc, 35, y);

  doc.setFillColor(...COLORS.headerBg);
  doc.roundedRect(PAGE.marginLeft, y, usableW, 4, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Observações', PAGE.marginLeft + 3, y + 3);
  y += 6;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);

  const rawObservations =
    (orcamento.observations_text && orcamento.observations_text.trim()) ||
    (profile?.default_budget_observations && profile.default_budget_observations.trim()) ||
    DEFAULT_BUDGET_OBSERVATIONS;

  const observations = rawObservations
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith('•') || l.startsWith('-') ? l : `• ${l}`));

  for (const obs of observations) {
    y = ensureSpace(doc, 5, y);
    const wrapped = doc.splitTextToSize(obs, usableW - 6);
    for (const line of wrapped) {
      y = ensureSpace(doc, 4, y);
      doc.text(line, PAGE.marginLeft + 3, y);
      y += 3.5;
    }
  }

  // Legal note
  if (notaLegal) {
    y += 2;
    y = ensureSpace(doc, 8, y);
    doc.setDrawColor(...COLORS.border);
    doc.line(PAGE.marginLeft + 3, y, PAGE.marginLeft + usableW - 3, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    const legalLines = doc.splitTextToSize(`Nota Fiscal: ${notaLegal}`, usableW - 10);
    doc.text(legalLines, PAGE.marginLeft + 3, y);
    y += legalLines.length * 3;
  }

  // ─── GENERATION DATE ──────────────────────────────────
  y += 5;
  y = ensureSpace(doc, 8, y);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`,
    pageW / 2,
    y,
    { align: 'center' }
  );

  // ─── FOOTERS ON ALL PAGES ─────────────────────────────
  addFooter(doc, companyName);

  return doc.output('blob');
}
