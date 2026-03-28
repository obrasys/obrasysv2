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

const PAGE = { left: 25, right: 25, top: 25, bottom: 25 };

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function usable(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  return { w: w - PAGE.left - PAGE.right, pw: w, ph: h };
}

function ensureSpace(doc: jsPDF, need: number, y: number): number {
  if (y + need > usable(doc).ph - PAGE.bottom) {
    doc.addPage();
    return PAGE.top;
  }
  return y;
}

function addFooter(doc: jsPDF, name: string | undefined) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const { pw, ph } = usable(doc);
    const fy = ph - 10;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(PAGE.left, fy - 2, pw - PAGE.right, fy - 2);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    if (name) doc.text(name, PAGE.left, fy + 1);
    doc.text(`Página ${i} de ${pages}`, pw - PAGE.right, fy + 1, { align: 'right' });
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

/** Render lines as bullet list ("- line;") */
function renderBulletList(doc: jsPDF, text: string, x: number, maxW: number, y: number, fontSize: number = 9): number {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const raw of rawLines) {
    // If it already starts with - or •, keep it; otherwise add -
    const line = raw.startsWith('-') || raw.startsWith('•') ? raw : `- ${raw}`;
    const wrapped = doc.splitTextToSize(line, maxW - 6);
    for (let j = 0; j < wrapped.length; j++) {
      y = ensureSpace(doc, 5, y);
      doc.text(wrapped[j], x + (j === 0 ? 0 : 3), y);
      y += 4.2;
    }
  }
  return y;
}

/** Render a section heading: bold, underlined */
function renderSectionTitle(doc: jsPDF, title: string, x: number, y: number, fontSize: number = 11): number {
  y = ensureSpace(doc, 10, y);
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(title, x, y);
  // underline
  const tw = doc.getTextWidth(title);
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.4);
  doc.line(x, y + 1, x + tw, y + 1);
  return y + 6;
}

export async function generateComercialPdf(options: ComercialPdfOptions): Promise<Blob> {
  const { orcamento, profile, valorFinal, taxaIVA, valorBase, valorIVA } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { w: uw, pw } = usable(doc);
  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome || '';
  const companyPhone = profile?.empresa_telefone || profile?.telefone || '';
  const companyNif = profile?.empresa_nif || profile?.nif || '';

  let y = PAGE.top;

  // ─── LOGO (centered or left) ───
  if (profile?.empresa_logo_url) {
    const logoResult = await loadImage(profile.empresa_logo_url);
    if (logoResult) {
      try {
        const maxH = 18;
        const maxW = 50;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxH * ratio;
        let logoH = maxH;
        if (logoW > maxW) { logoW = maxW; logoH = maxW / ratio; }
        const logoX = pw / 2 - logoW / 2;
        doc.addImage(logoResult.data, 'PNG', logoX, y, logoW, logoH);
        y += logoH + 4;
      } catch { /* skip */ }
    }
  }

  // ─── TITLE "Orçamento" centered ───
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Orçamento', pw / 2, y, { align: 'center' });
  y += 10;

  // ─── CLIENT / OBRA / DATE / CODE centered ───
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  if (orcamento.cliente?.nome) {
    doc.text(`Cliente: ${orcamento.cliente.nome}`, pw / 2, y, { align: 'center' });
    y += 5;
  }
  if (orcamento.obra?.nome) {
    doc.text(`Obra: ${orcamento.obra.nome}`, pw / 2, y, { align: 'center' });
    y += 5;
  }

  // Date + code on same line
  const dateStr = format(new Date(orcamento.data_criacao), "dd-MM-yyyy", { locale: pt });
  const codePart = orcamento.codigo ? `  orç nº${orcamento.codigo}` : '';
  doc.text(`Data: ${dateStr}${codePart}`, PAGE.left, y);
  y += 8;

  // ─── COMMERCIAL INTRO ───
  if (orcamento.commercial_intro_text) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const introLines = doc.splitTextToSize(orcamento.commercial_intro_text, uw);
    for (const line of introLines) {
      y = ensureSpace(doc, 5, y);
      doc.text(line, PAGE.left, y);
      y += 4.5;
    }
    y += 4;
  }

  // ─── CHAPTER BLOCKS (narrative with bullet lists) ───
  const chapters = (orcamento.capitulos || [])
    .filter(c => c.include_in_client_summary !== false)
    .sort((a, b) => (a.client_summary_order ?? a.ordem) - (b.client_summary_order ?? b.ordem));

  for (const cap of chapters) {
    // Chapter title — bold underlined
    const chTitle = cap.client_summary_title || `${cap.numero}. ${cap.titulo}`;
    y = renderSectionTitle(doc, chTitle, PAGE.left, y, 11);

    // Summary text as bullet list
    const summaryText = cap.client_summary_text;
    if (summaryText) {
      y = renderBulletList(doc, summaryText, PAGE.left, uw, y, 9);
      y += 2;
    }

    // Exclusions
    const exclusions = cap.client_exclusions_text;
    if (exclusions) {
      y += 2;
      // "Não está incluído neste orçamento:" bold underlined
      y = renderSectionTitle(doc, 'Não está incluído neste orçamento:', PAGE.left, y, 9);
      y = renderBulletList(doc, exclusions, PAGE.left, uw, y, 8.5);
      y += 2;
    }

    y += 4;
  }

  // ─── TOTAL ───
  y = ensureSpace(doc, 15, y);
  y += 2;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);

  // Show subtotal, IVA, and total
  const totalText = `Orçamento total: ${fmt(valorBase)} (+ IVA ${taxaIVA}%)`;
  doc.text(totalText, PAGE.left, y);
  const ttw = doc.getTextWidth(totalText);
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.4);
  doc.line(PAGE.left, y + 1, PAGE.left + ttw, y + 1);
  y += 6;

  doc.setFontSize(12);
  const grandTotalText = `Total com IVA: ${fmt(valorFinal)}`;
  doc.text(grandTotalText, PAGE.left, y);
  const gtw = doc.getTextWidth(grandTotalText);
  doc.line(PAGE.left, y + 1, PAGE.left + gtw, y + 1);
  y += 10;

  // ─── PAYMENT TERMS ───
  if (orcamento.commercial_payment_terms_text) {
    y = ensureSpace(doc, 12, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const ptLabel = `Condições de pagamento: ${orcamento.commercial_payment_terms_text}`;
    const ptLines = doc.splitTextToSize(ptLabel, uw);
    for (const line of ptLines) {
      y = ensureSpace(doc, 5, y);
      doc.text(line, PAGE.left, y);
      y += 4.2;
    }
    y += 2;
  }

  // ─── IVA note ───
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Todos os valores já têm o IVA incluído.', PAGE.left, y);
  y += 5;

  // ─── VALIDITY ───
  if (orcamento.commercial_validity_text) {
    y = ensureSpace(doc, 8, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Esta proposta é válida por ${orcamento.commercial_validity_text}.`, PAGE.left, y);
    y += 5;
  }

  // ─── NOTES ───
  if (orcamento.commercial_notes_text) {
    y = ensureSpace(doc, 10, y);
    doc.setFont('helvetica', 'bolditalic');
    const noteLabel = `Nota: ${orcamento.commercial_notes_text}`;
    const nLines = doc.splitTextToSize(noteLabel, uw);
    for (const line of nLines) {
      y = ensureSpace(doc, 5, y);
      doc.text(line, PAGE.left, y);
      y += 4.2;
    }
    y += 3;
  }

  // ─── Closing text ───
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text('Esperando merecer a vossa preferência, aguardo a vossa confirmação.', PAGE.left, y);
  y += 5;
  doc.text('Sem mais de momento.', PAGE.left, y);
  y += 8;

  // ─── SIGNATURE BLOCK ───
  if (orcamento.show_signature_block) {
    y = ensureSpace(doc, 50, y);

    // Push to lower part of page if there's enough space
    const { ph } = usable(doc);
    const sigBlockHeight = 45;
    const desiredSigY = ph - PAGE.bottom - sigBlockHeight;
    if (y < desiredSigY) y = desiredSigY;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);

    // Client signs
    doc.text('O cliente Adjudica: ', PAGE.left, y);
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    const lineStart = PAGE.left + doc.getTextWidth('O cliente Adjudica: ');
    doc.line(lineStart, y, PAGE.left + uw * 0.7, y);
    y += 7;

    doc.text('Data: _____/_____/_____', PAGE.left, y);
    y += 10;

    doc.text('Responsável: ', PAGE.left, y);
    const respLineStart = PAGE.left + doc.getTextWidth('Responsável: ');
    doc.line(respLineStart, y, PAGE.left + uw * 0.7, y);
    y += 6;

    // Company info
    if (companyName) {
      doc.text(companyName, PAGE.left, y);
      y += 4.5;
    }
    if (companyPhone) {
      doc.text(companyPhone, PAGE.left, y);
      y += 4.5;
    }
    if (companyNif) {
      doc.text(`NIF: ${companyNif}`, PAGE.left, y);
    }
  }

  addFooter(doc, companyName);
  return doc.output('blob');
}
