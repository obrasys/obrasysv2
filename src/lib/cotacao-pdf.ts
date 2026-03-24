import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CotacaoItem {
  item_name: string;
  unit: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  lead_time_days?: number;
  notes?: string;
}

interface CotacaoPdfData {
  categories: string[];
  location?: string;
  deadline?: string;
  message?: string;
  items: CotacaoItem[];
  notes?: string;
  estimatedDeliveryDays?: number;
  supplierName?: string;
  supplierNif?: string;
  date: string;
}

export function generateCotacaoPdf(data: CotacaoPdfData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Proposta de Cotação', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Data: ${data.date}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Supplier info
  if (data.supplierName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Fornecedor:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.supplierName, 50, y);
    y += 6;
    if (data.supplierNif) {
      doc.text(`NIF: ${data.supplierNif}`, 50, y);
      y += 6;
    }
    y += 4;
  }

  // Request info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Detalhes do Pedido', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (data.categories.length > 0) {
    doc.text(`Categorias: ${data.categories.join(', ')}`, 14, y);
    y += 6;
  }
  if (data.location) {
    doc.text(`Localização: ${data.location}`, 14, y);
    y += 6;
  }
  if (data.deadline) {
    doc.text(`Prazo solicitado: ${data.deadline}`, 14, y);
    y += 6;
  }
  if (data.message) {
    doc.text(`Mensagem: ${data.message}`, 14, y, { maxWidth: pageWidth - 28 });
    y += 6 + Math.floor(data.message.length / 80) * 5;
  }

  y += 6;

  // Items table
  const tableBody = data.items.map((item) => [
    item.item_name,
    item.unit,
    item.qty.toString(),
    `€${item.unit_price.toFixed(2)}`,
    `${item.vat_rate}%`,
    `€${(item.qty * item.unit_price).toFixed(2)}`,
  ]);

  const total = data.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const totalIva = data.items.reduce((sum, item) => sum + item.qty * item.unit_price * (item.vat_rate / 100), 0);

  autoTable(doc, {
    startY: y,
    head: [['Artigo', 'Un.', 'Qtd', 'Preço Unit.', 'IVA', 'Total']],
    body: tableBody,
    foot: [
      ['', '', '', '', 'Subtotal', `€${total.toFixed(2)}`],
      ['', '', '', '', 'IVA', `€${totalIva.toFixed(2)}`],
      ['', '', '', '', 'Total c/ IVA', `€${(total + totalIva).toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 95], fontSize: 9 },
    footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Additional info
  if (data.estimatedDeliveryDays) {
    doc.setFontSize(10);
    doc.text(`Prazo de entrega estimado: ${data.estimatedDeliveryDays} dias`, 14, y);
    y += 6;
  }

  if (data.notes) {
    doc.text(`Observações: ${data.notes}`, 14, y, { maxWidth: pageWidth - 28 });
    y += 8;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Gerado por ObraSys • Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}
