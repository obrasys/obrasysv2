import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Orcamento } from '@/types/orcamentos';

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
}

interface ComercialPdfOptions {
  orcamento: Orcamento;
  profile: PdfProfile | null;
  valorFinal: number;
  taxaIVA: number;
  valorBase: number;
  valorIVA: number;
}

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  primaryLight: [219, 234, 254] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  text: [55, 55, 55] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
  headerBg: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PAGE = { marginLeft: 15, marginRight: 15, marginTop: 18, marginBottom: 22 };

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function getUsable(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  return { width: w - PAGE.marginLeft - PAGE.marginRight, pageW: w, pageH: h };
}

function ensureSpace(doc: jsPDF, needed: number, y: number): number {
  const { pageH } = getUsable(doc);
  if (y + needed > pageH - PAGE.marginBottom) { doc.addPage(); return PAGE.marginTop; }
  return y;
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
    if (companyName) doc.text(companyName, PAGE.marginLeft, footerY);
    doc.text(`Página ${i} de ${pages}`, pageW - PAGE.marginRight, footerY, { align: 'right' });
  }
}

async function loadImage(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
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
          resolve({ data: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
        } catch { resolve(null); }
      };
      img.onerror = () => {
        fetch(url).then(r => r.blob()).then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const tempImg = new Image();
            tempImg.onload = () => resolve({ data: reader.result as string, width: tempImg.naturalWidth, height: tempImg.naturalHeight });
            tempImg.onerror = () => resolve(null);
            tempImg.src = reader.result as string;
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }).catch(() => resolve(null));
      };
      img.src = url;
    });
  } catch { return null; }
}

export async function generateComercialPdf(options: ComercialPdfOptions): Promise<Blob> {
  const { orcamento, profile, valorFinal, taxaIVA, valorBase, valorIVA } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { width: usableW, pageW } = getUsable(doc);
  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome || '';

  let y = PAGE.marginTop;

  // ─── HEADER ───
  let logoRendered = false;
  if (profile?.empresa_logo_url) {
    const logoResult = await loadImage(profile.empresa_logo_url);
    if (logoResult) {
      try {
        const maxH = 14;
        const maxW = 40;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxH * ratio;
        let logoH = maxH;
        if (logoW > maxW) { logoW = maxW; logoH = maxW / ratio; }
        doc.addImage(logoResult.data, 'PNG', PAGE.marginLeft, y, logoW, logoH);
        logoRendered = true;
      } catch { /* skip */ }
    }
  }

  const infoX = logoRendered ? PAGE.marginLeft + 44 : PAGE.marginLeft;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(companyName, infoX, y + 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  let infoY = y + 8;
  if (profile?.empresa_nif || profile?.nif) {
    doc.text(`NIF: ${profile?.empresa_nif || profile?.nif}`, infoX, infoY);
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
  if (profile?.empresa_telefone || profile?.telefone) contacts.push(`Tel: ${profile?.empresa_telefone || profile?.telefone}`);
  if (profile?.empresa_email || profile?.email) contacts.push(profile?.empresa_email || profile?.email || '');
  if (contacts.length) doc.text(contacts.join('  •  '), infoX, infoY);

  // Title right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('PROPOSTA COMERCIAL', pageW - PAGE.marginRight, y + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  if (orcamento.codigo) doc.text(orcamento.codigo, pageW - PAGE.marginRight, y + 10, { align: 'right' });
  doc.text(`Data: ${format(new Date(orcamento.data_criacao), "d 'de' MMMM 'de' yyyy", { locale: pt })}`, pageW - PAGE.marginRight, y + 14, { align: 'right' });

  y += 20;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(PAGE.marginLeft, y, pageW - PAGE.marginRight, y);
  y += 6;

  // ─── TITLE ───
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  const titleLines = doc.splitTextToSize(orcamento.titulo, usableW);
  doc.text(titleLines, PAGE.marginLeft, y);
  y += titleLines.length * 5 + 2;

  if (orcamento.obra?.nome) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Obra: ${orcamento.obra.nome}`, PAGE.marginLeft, y);
    y += 4;
  }

  // ─── CLIENT BOX ───
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
    doc.setTextColor(...COLORS.text);

    const col2 = PAGE.marginLeft + usableW / 2;
    doc.setFont('helvetica', 'bold');
    doc.text(c.nome, PAGE.marginLeft + 4, y + 9);
    doc.setFont('helvetica', 'normal');
    if (c.empresa) doc.text(c.empresa, PAGE.marginLeft + 4, y + 13);
    if (c.nif) doc.text(`NIF: ${c.nif}`, PAGE.marginLeft + 4, y + 17);

    if (c.endereco) {
      let addr = c.endereco;
      if (c.codigo_postal) addr += `, ${c.codigo_postal}`;
      if (c.cidade) addr += ` ${c.cidade}`;
      doc.text(addr, col2, y + 9);
    }
    if (c.telemovel || c.telefone) doc.text(`Tel: ${c.telemovel || c.telefone}`, col2, y + 13);
    if (c.email) doc.text(c.email, col2, y + 17);

    y += 24;
  }

  y += 4;

  // ─── COMMERCIAL INTRO ───
  if (orcamento.commercial_intro_text) {
    y = ensureSpace(doc, 15, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const introLines = doc.splitTextToSize(orcamento.commercial_intro_text, usableW - 6);
    doc.text(introLines, PAGE.marginLeft + 3, y);
    y += introLines.length * 4 + 4;
  }

  // ─── CHAPTER BLOCKS (narrative) ───
  const chapters = (orcamento.capitulos || [])
    .filter(c => c.include_in_client_summary !== false)
    .sort((a, b) => (a.client_summary_order ?? a.ordem) - (b.client_summary_order ?? b.ordem));

  for (const cap of chapters) {
    y = ensureSpace(doc, 20, y);

    // Chapter header
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(PAGE.marginLeft, y, usableW, 7, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    const chTitle = cap.client_summary_title || `${cap.numero}. ${cap.titulo}`;
    doc.text(chTitle, PAGE.marginLeft + 3, y + 5);
    y += 10;

    // Summary text
    const summaryText = cap.client_summary_text;
    if (summaryText) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const sLines = doc.splitTextToSize(summaryText, usableW - 8);
      for (let i = 0; i < sLines.length; i++) {
        y = ensureSpace(doc, 4, y);
        doc.text(sLines[i], PAGE.marginLeft + 4, y);
        y += 3.8;
      }
      y += 2;
    }

    // Exclusions
    const exclusions = cap.client_exclusions_text;
    if (exclusions) {
      y = ensureSpace(doc, 8, y);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.muted);
      doc.text('Exclusões:', PAGE.marginLeft + 4, y);
      y += 3.5;
      doc.setFont('helvetica', 'italic');
      const exLines = doc.splitTextToSize(exclusions, usableW - 12);
      for (let i = 0; i < exLines.length; i++) {
        y = ensureSpace(doc, 4, y);
        doc.text(exLines[i], PAGE.marginLeft + 6, y);
        y += 3.5;
      }
      y += 2;
    }

    // Separator
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.15);
    doc.line(PAGE.marginLeft + 3, y, pageW - PAGE.marginRight - 3, y);
    y += 4;
  }

  // ─── TOTAL ───
  y = ensureSpace(doc, 30, y);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginLeft, y, pageW - PAGE.marginRight, y);
  y += 6;

  const summaryX = pageW - PAGE.marginRight - 60;
  const summaryValX = pageW - PAGE.marginRight - 3;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text('Subtotal (s/ IVA)', summaryX, y);
  doc.text(fmt(valorBase), summaryValX, y, { align: 'right' });
  y += 5;

  doc.text(`IVA (${taxaIVA}%)`, summaryX, y);
  doc.text(fmt(valorIVA), summaryValX, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(summaryX, y, summaryValX, y);
  y += 1;
  doc.line(summaryX, y, summaryValX, y);
  y += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TOTAL', summaryX, y);
  doc.text(fmt(valorFinal), summaryValX, y, { align: 'right' });
  y += 10;

  // ─── PAYMENT TERMS ───
  if (orcamento.commercial_payment_terms_text) {
    y = ensureSpace(doc, 15, y);
    doc.setFillColor(...COLORS.headerBg);
    doc.roundedRect(PAGE.marginLeft, y, usableW, 4, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Condições de Pagamento', PAGE.marginLeft + 3, y + 3);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const ptLines = doc.splitTextToSize(orcamento.commercial_payment_terms_text, usableW - 6);
    doc.text(ptLines, PAGE.marginLeft + 3, y);
    y += ptLines.length * 3.5 + 3;
  }

  // ─── VALIDITY ───
  if (orcamento.commercial_validity_text) {
    y = ensureSpace(doc, 10, y);
    doc.setFillColor(...COLORS.headerBg);
    doc.roundedRect(PAGE.marginLeft, y, usableW, 4, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Validade', PAGE.marginLeft + 3, y + 3);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const vLines = doc.splitTextToSize(orcamento.commercial_validity_text, usableW - 6);
    doc.text(vLines, PAGE.marginLeft + 3, y);
    y += vLines.length * 3.5 + 3;
  }

  // ─── NOTES ───
  if (orcamento.commercial_notes_text) {
    y = ensureSpace(doc, 10, y);
    doc.setFillColor(...COLORS.headerBg);
    doc.roundedRect(PAGE.marginLeft, y, usableW, 4, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Observações', PAGE.marginLeft + 3, y + 3);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const nLines = doc.splitTextToSize(orcamento.commercial_notes_text, usableW - 6);
    doc.text(nLines, PAGE.marginLeft + 3, y);
    y += nLines.length * 3.5 + 3;
  }

  // ─── SIGNATURE BLOCK ───
  if (orcamento.show_signature_block) {
    y = ensureSpace(doc, 40, y);
    y += 5;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);

    const sigW = (usableW - 10) / 2;
    const sigLeftX = PAGE.marginLeft;
    const sigRightX = PAGE.marginLeft + sigW + 10;

    // Left: company
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text('O Prestador de Serviços:', sigLeftX, y);
    y += 15;
    doc.line(sigLeftX, y, sigLeftX + sigW, y);
    doc.text(companyName, sigLeftX, y + 4);

    // Right: client
    const clientName = orcamento.cliente?.nome || 'O Cliente';
    doc.text('O Cliente:', sigRightX, y - 15);
    doc.line(sigRightX, y, sigRightX + sigW, y);
    doc.text(clientName, sigRightX, y + 4);

    y += 10;
  }

  // ─── GENERATION DATE ───
  y += 5;
  y = ensureSpace(doc, 8, y);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`,
    pageW / 2, y, { align: 'center' }
  );

  addFooter(doc, companyName);
  return doc.output('blob');
}
