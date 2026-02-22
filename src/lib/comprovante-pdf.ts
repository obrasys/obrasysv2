import jsPDF from 'jspdf';
import type { ContaFinanceira } from '@/types/financeiro';
import { ORIGEM_CONTA_CONFIG } from '@/types/financeiro';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

export function generateComprovantePdf(conta: ContaFinanceira): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE PAGAMENTO', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Divider
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(20, y, pageWidth - 20, y);
  y += 12;

  // Info block
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, y);
    y += 8;
  };

  addRow('Tipo:', conta.tipo === 'pagar' ? 'A Pagar' : 'A Receber');
  addRow('Origem:', ORIGEM_CONTA_CONFIG[conta.origem]?.label || conta.origem);
  addRow('Valor:', formatCurrency(Number(conta.valor)));
  addRow('Vencimento:', format(parseISO(conta.data_vencimento), 'dd/MM/yyyy', { locale: pt }));

  if (conta.pago && conta.data_pagamento) {
    addRow('Data Pagamento:', format(parseISO(conta.data_pagamento), 'dd/MM/yyyy', { locale: pt }));
  }

  addRow('Estado:', conta.pago ? 'Pago' : 'Pendente');

  if (conta.descricao) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Descrição:', 25, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(conta.descricao, pageWidth - 50);
    doc.text(lines, 25, y);
    y += lines.length * 6 + 4;
  }

  if (conta.obra?.nome) {
    addRow('Obra:', conta.obra.nome);
  }

  if (conta.fornecedor?.nome) {
    addRow('Fornecedor:', conta.fornecedor.nome);
  }

  if (conta.cliente?.nome) {
    addRow('Cliente:', conta.cliente.nome);
  }

  // Footer divider
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  return doc.output('blob');
}
