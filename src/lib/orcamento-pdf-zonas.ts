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
  empresa_pais?: string | null;
  empresa_telefone?: string | null;
  telefone?: string | null;
  empresa_email?: string | null;
  email?: string | null;
  empresa_website?: string | null;
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

interface Options {
  orcamento: Orcamento;
  profile: PdfProfile | null;
  taxaIVA: number;
  valorBase: number;
  valorIVA: number;
  valorFinal: number;
  ivaBreakdown?: IvaBreakdown;
}


const PAGE = { ml: 15, mr: 15, mt: 18, mb: 22 };
const COLORS = {
  primary: [15, 76, 92] as [number, number, number],
  primaryLight: [220, 232, 236] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  text: [55, 55, 55] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

async function loadImage(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => resolve({ data: reader.result as string, width: img.width, height: img.height });
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function pageInfo(doc: jsPDF) {
  return {
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
  };
}

function ensureSpace(doc: jsPDF, needed: number, y: number, drawSubHeader?: () => number): number {
  const { pageH } = pageInfo(doc);
  if (y + needed > pageH - PAGE.mb) {
    doc.addPage();
    if (drawSubHeader) return drawSubHeader();
    return PAGE.mt;
  }
  return y;
}

function drawFooter(doc: jsPDF, companyName: string, codigo: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const { pageW, pageH } = pageInfo(doc);
    const fy = pageH - 8;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE.ml, fy - 3, pageW - PAGE.mr, fy - 3);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    const left = [companyName, codigo].filter(Boolean).join(' • ');
    if (left) doc.text(left, PAGE.ml, fy);
    doc.text(`Página ${i} de ${pages}`, pageW - PAGE.mr, fy, { align: 'right' });
  }
}

export async function generateOrcamentoPdfZonas(opts: Options): Promise<Blob> {
  const { orcamento, profile, taxaIVA, valorBase, valorIVA, valorFinal } = opts;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { pageW } = pageInfo(doc);
  const usableW = pageW - PAGE.ml - PAGE.mr;
  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome || '';
  const companyNif = profile?.empresa_nif || profile?.nif;

  let y = PAGE.mt;

  // ── HEADER (1ª página) ──
  let logoRendered = false;
  if (profile?.empresa_logo_url) {
    const logo = await loadImage(profile.empresa_logo_url);
    if (logo) {
      try {
        const maxH = 14, maxW = 40;
        const ratio = logo.width / logo.height;
        let w = maxH * ratio, h = maxH;
        if (w > maxW) { w = maxW; h = maxW / ratio; }
        doc.addImage(logo.data, 'PNG', PAGE.ml, y, w, h);
        logoRendered = true;
      } catch { /* ignore */ }
    }
  }

  const infoX = logoRendered ? PAGE.ml + 44 : PAGE.ml;
  if (companyName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(companyName, infoX, y + 4);
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  let iy = y + 8;
  if (companyNif) { doc.text(`NIF: ${companyNif}`, infoX, iy); iy += 3.5; }
  if (profile?.empresa_morada) {
    let addr = profile.empresa_morada;
    if (profile.empresa_codigo_postal) addr += `, ${profile.empresa_codigo_postal}`;
    if (profile.empresa_cidade) addr += ` ${profile.empresa_cidade}`;
    if (profile.empresa_pais) addr += `, ${profile.empresa_pais}`;
    doc.text(addr, infoX, iy); iy += 3.5;
  }
  const contacts: string[] = [];
  if (profile?.empresa_telefone || profile?.telefone) contacts.push(`Tel: ${profile?.empresa_telefone || profile?.telefone}`);
  if (profile?.empresa_email || profile?.email) contacts.push(profile?.empresa_email || profile?.email || '');
  if (profile?.empresa_website) contacts.push(profile.empresa_website);
  if (contacts.length) doc.text(contacts.join('  •  '), infoX, iy);

  // Title right
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('ORÇAMENTO', pageW - PAGE.mr, y + 5, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  if (orcamento.codigo) doc.text(orcamento.codigo, pageW - PAGE.mr, y + 10, { align: 'right' });
  doc.text(
    `Data: ${format(new Date(orcamento.data_criacao), "d 'de' MMMM 'de' yyyy", { locale: pt })}`,
    pageW - PAGE.mr, y + 14, { align: 'right' }
  );

  y += 22;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(PAGE.ml, y, pageW - PAGE.mr, y);
  y += 6;

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  const titleLines = doc.splitTextToSize(orcamento.titulo, usableW);
  doc.text(titleLines, PAGE.ml, y);
  y += titleLines.length * 5 + 2;

  if (orcamento.obra?.nome) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Obra: ${orcamento.obra.nome}`, PAGE.ml, y);
    y += 4;
  }

  // Cliente
  if (orcamento.cliente) {
    y += 2;
    const c = orcamento.cliente;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(PAGE.ml, y, usableW, 18, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('CLIENTE', PAGE.ml + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    let cy = y + 9;
    doc.setFont('helvetica', 'bold');
    doc.text(c.nome || '', PAGE.ml + 4, cy);
    doc.setFont('helvetica', 'normal');
    cy += 4;
    const cInfo: string[] = [];
    if (c.empresa) cInfo.push(c.empresa);
    if (c.nif) cInfo.push(`NIF: ${c.nif}`);
    if (c.email) cInfo.push(c.email);
    if (cInfo.length) doc.text(cInfo.join('  •  '), PAGE.ml + 4, cy);
    y += 22;
  }

  y += 4;

  // ── ESTRUTURA POR ZONA → ÁREA → TIPO → SERVIÇO ──
  const chapters = orcamento.capitulos || [];

  // Reuso: cabeçalho condensado nas páginas seguintes
  const drawSubHeader = (): number => {
    const sy = PAGE.mt;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    if (companyName) doc.text(companyName, PAGE.ml, sy);
    if (orcamento.codigo) doc.text(orcamento.codigo, pageW - PAGE.mr, sy, { align: 'right' });
    doc.setDrawColor(...COLORS.primaryLight);
    doc.setLineWidth(0.3);
    doc.line(PAGE.ml, sy + 2, pageW - PAGE.mr, sy + 2);
    return sy + 6;
  };

  let grandTotal = 0;

  for (const cap of chapters) {
    const artigos = (cap as any).artigos || [];
    if (!artigos.length) continue;

    y = ensureSpace(doc, 18, y, drawSubHeader);

    // Chapter bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(PAGE.ml, y, usableW, 8, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const capLabel = `${cap.numero ? String(cap.numero).padStart(2, '0') + ' — ' : ''}${cap.titulo || ''}`;
    doc.text(capLabel, PAGE.ml + 3, y + 5.5);
    y += 11;

    // Group: zone → area → service_type
    type GKey = string;
    const grouped = new Map<GKey, Map<GKey, Map<GKey, any[]>>>();
    for (const a of artigos) {
      const z = (a.zone_name || '').trim() || '__SEM_ZONA__';
      const ar = (a.area_name || '').trim() || '__SEM_AREA__';
      const st = (a.service_type_name || '').trim() || '__SEM_TIPO__';
      if (!grouped.has(z)) grouped.set(z, new Map());
      const zMap = grouped.get(z)!;
      if (!zMap.has(ar)) zMap.set(ar, new Map());
      const aMap = zMap.get(ar)!;
      if (!aMap.has(st)) aMap.set(st, []);
      aMap.get(st)!.push(a);
    }

    let capTotal = 0;

    const sortedZones = [...grouped.keys()].sort();
    for (const z of sortedZones) {
      const zMap = grouped.get(z)!;
      const zoneLabel = z === '__SEM_ZONA__' ? '' : z.toUpperCase();
      if (zoneLabel) {
        y = ensureSpace(doc, 10, y, drawSubHeader);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(zoneLabel, PAGE.ml + 2, y + 4);
        y += 6;
      }

      const sortedAreas = [...zMap.keys()].sort();
      for (const ar of sortedAreas) {
        const aMap = zMap.get(ar)!;
        const areaLabel = ar === '__SEM_AREA__' ? '' : ar;
        if (areaLabel) {
          y = ensureSpace(doc, 8, y, drawSubHeader);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.dark);
          doc.text(areaLabel, PAGE.ml + 6, y + 4);
          y += 5;
        }

        const sortedTypes = [...aMap.keys()].sort();
        for (const st of sortedTypes) {
          const items = aMap.get(st)!;
          const typeLabel = st === '__SEM_TIPO__' ? '' : st;
          if (typeLabel) {
            y = ensureSpace(doc, 6, y, drawSubHeader);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...COLORS.muted);
            doc.text(typeLabel, PAGE.ml + 10, y + 3.5);
            y += 5;
          }

          // Items
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.text);
          for (const it of items) {
            y = ensureSpace(doc, 6, y, drawSubHeader);
            const total = Number(it.quantidade || 0) * Number(it.preco_unitario || 0);
            capTotal += total;
            const desc = it.descricao || '';
            const qty = `${Number(it.quantidade || 0).toLocaleString('pt-PT', { maximumFractionDigits: 3 })} ${it.unidade || ''}`;
            const totalStr = fmt(total);
            const indent = typeLabel ? 14 : (areaLabel ? 10 : (zoneLabel ? 6 : 2));
            const descMaxW = usableW - indent - 60;
            const lines = doc.splitTextToSize(desc, descMaxW);
            doc.text(lines, PAGE.ml + indent, y + 3.5);
            doc.text(qty, pageW - PAGE.mr - 35, y + 3.5, { align: 'right' });
            doc.text(totalStr, pageW - PAGE.mr, y + 3.5, { align: 'right' });
            y += lines.length * 4 + 1;
          }
        }
      }
    }

    // Chapter subtotal
    grandTotal += capTotal;
    y = ensureSpace(doc, 8, y, drawSubHeader);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE.ml, y, pageW - PAGE.mr, y);
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Subtotal ${cap.titulo || 'Capítulo'}`, PAGE.ml + 2, y + 3);
    doc.text(fmt(capTotal), pageW - PAGE.mr, y + 3, { align: 'right' });
    y += 8;
  }

  // ── TOTAIS ──
  y = ensureSpace(doc, 30, y, drawSubHeader);
  y += 4;
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(pageW - PAGE.mr - 80, y, 80, 22, 1.5, 1.5, 'F');
  const tx = pageW - PAGE.mr - 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text('Subtotal:', pageW - PAGE.mr - 78, y + 5);
  doc.text(fmt(valorBase), tx, y + 5, { align: 'right' });
  doc.text(`IVA (${(taxaIVA * 100).toFixed(0)}%):`, pageW - PAGE.mr - 78, y + 11);
  doc.text(fmt(valorIVA), tx, y + 11, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TOTAL:', pageW - PAGE.mr - 78, y + 18);
  doc.text(fmt(valorFinal), tx, y + 18, { align: 'right' });

  drawFooter(doc, companyName, orcamento.codigo || '');
  return doc.output('blob');
}
