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

interface IvaBreakdown {
  laborBase: number;
  laborRate: number;
  laborValue: number;
  materialBase: number;
  materialRate: number;
  materialValue: number;
}

interface ComercialPdfOptions {
  orcamento: Orcamento;
  profile: PdfProfile | null;
  valorFinal: number;
  taxaIVA: number;
  valorBase: number;
  valorIVA: number;
  ivaBreakdown?: IvaBreakdown;
}


const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  text: [55, 55, 55] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
};

const PAGE = { left: 15, right: 15, top: 18, bottom: 22 };

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function usable(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  return { uw: w - PAGE.left - PAGE.right, pw: w, ph: h };
}

function ensureSpace(doc: jsPDF, need: number, y: number): number {
  const { ph } = usable(doc);
  if (y + need > ph - PAGE.bottom) {
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
    const fy = ph - 8;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE.left, fy - 3, pw - PAGE.right, fy - 3);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    if (name) doc.text(name, PAGE.left, fy);
    doc.text(`Página ${i} de ${pages}`, pw - PAGE.right, fy, { align: 'right' });
  }
}

async function loadImage(url: string): Promise<{ data: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null> {
  const readDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('reader'));
      reader.readAsDataURL(blob);
    });

  const measure = (dataUrl: string): Promise<{ w: number; h: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('img'));
      img.src = dataUrl;
    });

  // Prefer fetch — works reliably with Supabase Storage public URLs and avoids
  // tainted-canvas issues when the storage CDN does not negotiate CORS for <img>.
  try {
    const resp = await fetch(url, { mode: 'cors', cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const dataUrl = await readDataUrl(blob);
    const { w, h } = await measure(dataUrl);
    const format: 'PNG' | 'JPEG' = /jpe?g/i.test(blob.type) ? 'JPEG' : 'PNG';
    return { data: dataUrl, width: w, height: h, format };
  } catch {
    // Fallback: <img crossOrigin> + canvas
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
          resolve({ data: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight, format: 'PNG' });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

export async function generateComercialPdf(options: ComercialPdfOptions): Promise<Blob> {
  const { orcamento, profile, valorFinal, taxaIVA, valorBase, valorIVA, ivaBreakdown } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { uw, pw } = usable(doc);
  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome || '';
  const companyNif = profile?.empresa_nif || profile?.nif || '';
  const companyPhone = profile?.empresa_telefone || profile?.telefone || '';
  const companyEmail = profile?.empresa_email || profile?.email || '';

  let y = PAGE.top;

  // ─── HEADER (same as technical PDF) ───────────────────────
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
        doc.addImage(logoResult.data, logoResult.format, PAGE.left, y, logoW, logoH);
        logoRendered = true;
      } catch { /* skip */ }
    }
  }

  // Company info (center-left)
  const infoX = logoRendered ? PAGE.left + 44 : PAGE.left;
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
  if (companyPhone) contacts.push(`Tel: ${companyPhone}`);
  if (companyEmail) contacts.push(companyEmail);
  if (contacts.length) {
    doc.text(contacts.join('  •  '), infoX, infoY);
  }

  // "ORÇAMENTO" title (right)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('ORÇAMENTO', pw - PAGE.right, y + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  if (orcamento.codigo) {
    doc.text(orcamento.codigo, pw - PAGE.right, y + 10, { align: 'right' });
  }
  doc.text(
    `Data: ${format(new Date(orcamento.data_criacao), "d 'de' MMMM 'de' yyyy", { locale: pt })}`,
    pw - PAGE.right, y + 14, { align: 'right' }
  );

  y += 20;

  // Blue divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(PAGE.left, y, pw - PAGE.right, y);
  y += 6;

  // ─── BUDGET TITLE & CLIENT ────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  const titleLines = doc.splitTextToSize(orcamento.titulo, uw);
  doc.text(titleLines, PAGE.left, y);
  y += titleLines.length * 5 + 2;

  if (orcamento.obra?.nome) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Obra: ${orcamento.obra.nome}`, PAGE.left, y);
    y += 4;
  }

  if (orcamento.cliente?.nome) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`Cliente: ${orcamento.cliente.nome}`, PAGE.left, y);
    y += 4;
  }
  y += 4;

  // ─── COMMERCIAL INTRO ─────────────────────────────────────
  if (orcamento.commercial_intro_text) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const introLines = doc.splitTextToSize(orcamento.commercial_intro_text, uw);
    for (const line of introLines) {
      y = ensureSpace(doc, 5, y);
      doc.text(line, PAGE.left, y);
      y += 4.5;
    }
    y += 4;
  }

  // ─── CHAPTERS WITH ARTICLE DESCRIPTIONS (no prices) ───────
  const chapters = (orcamento.capitulos || [])
    .filter(c => c.include_in_client_summary !== false)
    .sort((a, b) => (a.client_summary_order ?? a.ordem) - (b.client_summary_order ?? b.ordem));

  for (const cap of chapters) {
    // Chapter title
    const chTitle = cap.client_summary_title || `${cap.numero}. ${cap.titulo}`;
    y = ensureSpace(doc, 10, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(chTitle, PAGE.left, y);
    y += 5;

    // List article descriptions (no price, no qty, no unit) — grouped by Zona de Intervenção
    const artigos = (cap.artigos || []).slice().sort((a, b) => a.ordem - b.ordem);
    if (artigos.length > 0) {
      // Group by property_type_name (Zona de Intervenção)
      const sortPt = (a: string, b: string) =>
        a.localeCompare(b, 'pt', { numeric: true, sensitivity: 'base' });
      const groups = new Map<string, typeof artigos>();
      for (const art of artigos) {
        const key = ((art as any).property_type_name || '').trim() || '__SEM_PROP__';
        if (!groups.has(key)) groups.set(key, [] as typeof artigos);
        groups.get(key)!.push(art);
      }
      const groupKeys = [...groups.keys()].sort(sortPt);
      const hasAnyProp = groupKeys.some((k) => k !== '__SEM_PROP__');

      for (const gk of groupKeys) {
        const groupArtigos = groups.get(gk)!;
        const propLabel = gk === '__SEM_PROP__' ? '' : gk;

        if (propLabel && hasAnyProp) {
          y = ensureSpace(doc, 7, y);
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.primary);
          doc.text(`Zona de Intervenção: ${propLabel}`, PAGE.left, y);
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
        for (const art of groupArtigos) {
          const zona = ((art as any).zone_name || '').trim();
          const area = ((art as any).area_name || '').trim();
          const ctxBits: string[] = [];
          if (zona) ctxBits.push(`Zona: ${zona}`);
          if (area) ctxBits.push(`Área: ${area}`);
          const ctx = ctxBits.length ? ` (${ctxBits.join(' • ')})` : '';
          const desc = art.descricao + ctx;
          const wrapped = doc.splitTextToSize(`- ${desc}`, uw - 4);
          for (let j = 0; j < wrapped.length; j++) {
            y = ensureSpace(doc, 4.5, y);
            doc.text(wrapped[j], PAGE.left + 2, y);
            y += 4.2;
          }
        }
      }
    } else if (cap.client_summary_text) {
      // Fallback: use narrative summary
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const lines = cap.client_summary_text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const wrapped = doc.splitTextToSize(`- ${line}`, uw - 4);
        for (let j = 0; j < wrapped.length; j++) {
          y = ensureSpace(doc, 4.5, y);
          doc.text(wrapped[j], PAGE.left + 2, y);
          y += 4.2;
        }
      }
    }

    } else if (cap.client_summary_text) {
      // Fallback: use narrative summary
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const lines = cap.client_summary_text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const wrapped = doc.splitTextToSize(`- ${line}`, uw - 4);
        for (let j = 0; j < wrapped.length; j++) {
          y = ensureSpace(doc, 4.5, y);
          doc.text(wrapped[j], PAGE.left + 2, y);
          y += 4.2;
        }
      }
    }

    // Exclusions
    if (cap.client_exclusions_text) {
      y += 2;
      y = ensureSpace(doc, 8, y);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text('Não está incluído neste orçamento:', PAGE.left, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const exLines = cap.client_exclusions_text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of exLines) {
        const wrapped = doc.splitTextToSize(`- ${line}`, uw - 4);
        for (let j = 0; j < wrapped.length; j++) {
          y = ensureSpace(doc, 4.5, y);
          doc.text(wrapped[j], PAGE.left + 2, y);
          y += 4.2;
        }
      }
    }

    y += 4;
  }

  // ─── TOTAL (boxed) ────────────────────────────────────────
  y = ensureSpace(doc, 18, y);
  y += 3;

  const totalLabel = `Orçamento total: ${fmt(valorBase)} (+ IVA ${taxaIVA}%)`;
  const grandLabel = `Total com IVA: ${fmt(valorFinal)}`;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);

  // Draw bordered box
  const boxH = 16;
  const boxW = uw;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.rect(PAGE.left, y - 1, boxW, boxH);

  doc.text(totalLabel, PAGE.left + 4, y + 4);
  doc.setFontSize(12);
  doc.text(grandLabel, PAGE.left + 4, y + 11);

  y += boxH + 6;

  // ─── CONDITIONS FOOTER ────────────────────────────────────
  // Payment terms
  if (orcamento.commercial_payment_terms_text) {
    y = ensureSpace(doc, 8, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Condições de pagamento: ', PAGE.left, y);
    const labelW = doc.getTextWidth('Condições de pagamento: ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const ptLines = doc.splitTextToSize(orcamento.commercial_payment_terms_text, uw - labelW);
    doc.text(ptLines[0], PAGE.left + labelW, y);
    y += 4.5;
    for (let i = 1; i < ptLines.length; i++) {
      y = ensureSpace(doc, 4.5, y);
      doc.text(ptLines[i], PAGE.left, y);
      y += 4.5;
    }
  }

  // IVA note
  y = ensureSpace(doc, 6, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Todos os valores já têm o IVA incluído.', PAGE.left, y);
  y += 5;

  // Validity
  if (orcamento.commercial_validity_text) {
    y = ensureSpace(doc, 6, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Validade: `, PAGE.left, y);
    const vLabelW = doc.getTextWidth('Validade: ');
    doc.setFont('helvetica', 'normal');
    doc.text(orcamento.commercial_validity_text, PAGE.left + vLabelW, y);
    y += 5;
  }

  // Notes
  if (orcamento.commercial_notes_text) {
    y = ensureSpace(doc, 8, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Nota: ', PAGE.left, y);
    const nLabelW = doc.getTextWidth('Nota: ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const nLines = doc.splitTextToSize(orcamento.commercial_notes_text, uw - nLabelW);
    doc.text(nLines[0], PAGE.left + nLabelW, y);
    y += 4.5;
    for (let i = 1; i < nLines.length; i++) {
      y = ensureSpace(doc, 4.5, y);
      doc.text(nLines[i], PAGE.left, y);
      y += 4.5;
    }
    y += 2;
  }

  // Closing text
  y = ensureSpace(doc, 10, y);
  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text('Esperando merecer a vossa preferência, aguardo a vossa confirmação.', PAGE.left, y);
  y += 5;
  doc.text('Sem mais de momento.', PAGE.left, y);
  y += 8;

  // ─── SIGNATURE BLOCK ──────────────────────────────────────
  if (orcamento.show_signature_block) {
    y = ensureSpace(doc, 45, y);
    const { ph } = usable(doc);
    const desiredY = ph - PAGE.bottom - 45;
    if (y < desiredY) y = desiredY;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    doc.text('O cliente Adjudica: ', PAGE.left, y);
    const adjW = doc.getTextWidth('O cliente Adjudica: ');
    doc.setDrawColor(...COLORS.text);
    doc.setLineWidth(0.3);
    doc.line(PAGE.left + adjW, y, PAGE.left + uw * 0.7, y);
    y += 7;

    doc.text('Data: _____/_____/_____', PAGE.left, y);
    y += 10;

    doc.text('Responsável: ', PAGE.left, y);
    const rW = doc.getTextWidth('Responsável: ');
    doc.line(PAGE.left + rW, y, PAGE.left + uw * 0.7, y);
    y += 6;

    if (companyName) { doc.text(companyName, PAGE.left, y); y += 4.5; }
    if (companyPhone) { doc.text(companyPhone, PAGE.left, y); y += 4.5; }
    if (companyNif) { doc.text(`NIF: ${companyNif}`, PAGE.left, y); }
  }

  addFooter(doc, companyName);
  return doc.output('blob');
}
