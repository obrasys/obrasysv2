import { useState } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { pt, es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AutoMedicao } from '@/types/autos-medicao';

interface AutoMedicaoPdfExportProps {
  auto: AutoMedicao;
}

// Translations
const translations = {
  pt: {
    title: 'AUTO DE MEDIÇÃO',
    autoNumber: 'Auto nº',
    page: 'Página',
    of: 'de',
    projectInfo: 'INFORMAÇÃO DA OBRA',
    project: 'Obra',
    location: 'Localização',
    client: 'Cliente',
    period: 'Período de Medição',
    to: 'a',
    measurementInfo: 'DADOS DA MEDIÇÃO',
    contractor: 'Empreiteiro',
    contractRef: 'Ref. Contrato',
    contractType: 'Tipo de Contrato',
    phase: 'Fase da Obra',
    zone: 'Zona de Medição',
    technicalResponsibility: 'RESPONSABILIDADE TÉCNICA',
    responsible: 'Responsável',
    position: 'Cargo',
    professionalOrder: 'Ordem Profissional',
    inspector: 'Fiscal de Obra',
    inspectorEntity: 'Entidade Fiscalizadora',
    measuredItems: 'ITENS MEDIDOS',
    code: 'Código',
    description: 'Descrição',
    unit: 'Un.',
    predicted: 'Previsto',
    previous: 'Anterior',
    current: 'Atual',
    accumulated: 'Acumulado',
    unitPrice: 'P.Unit.',
    currentValue: 'Valor Atual',
    deviation: 'Desvio',
    financialSummary: 'RESUMO FINANCEIRO',
    predictedValue: 'Valor Previsto',
    currentMeasured: 'Medido Atual',
    accumulatedMeasured: 'Medido Acumulado',
    globalProgress: 'Progresso Global',
    vat: 'IVA',
    totalWithVat: 'Total c/ IVA',
    technicalObs: 'OBSERVAÇÕES TÉCNICAS',
    executionConditions: 'Condições de Execução',
    observations: 'Observações',
    nonConformities: 'Não Conformidades',
    applicableStandards: 'NORMAS APLICÁVEIS',
    signatures: 'ASSINATURAS',
    responsibleSignature: 'O Responsável pela Medição',
    inspectorSignature: 'O Fiscal de Obra',
    clientSignature: 'O Dono de Obra / Cliente',
    date: 'Data',
    generatedOn: 'Documento gerado em',
    validatedOn: 'Validado em',
  },
  es: {
    title: 'CERTIFICADO DE MEDICIÓN',
    autoNumber: 'Certificado nº',
    page: 'Página',
    of: 'de',
    projectInfo: 'INFORMACIÓN DE LA OBRA',
    project: 'Obra',
    location: 'Ubicación',
    client: 'Cliente',
    period: 'Período de Medición',
    to: 'a',
    measurementInfo: 'DATOS DE LA MEDICIÓN',
    contractor: 'Contratista',
    contractRef: 'Ref. Contrato',
    contractType: 'Tipo de Contrato',
    phase: 'Fase de la Obra',
    zone: 'Zona de Medición',
    technicalResponsibility: 'RESPONSABILIDAD TÉCNICA',
    responsible: 'Responsable',
    position: 'Cargo',
    professionalOrder: 'Colegio Profesional',
    inspector: 'Director de Obra',
    inspectorEntity: 'Entidad Fiscalizadora',
    measuredItems: 'PARTIDAS MEDIDAS',
    code: 'Código',
    description: 'Descripción',
    unit: 'Ud.',
    predicted: 'Previsto',
    previous: 'Anterior',
    current: 'Actual',
    accumulated: 'Acumulado',
    unitPrice: 'P.Unit.',
    currentValue: 'Importe Actual',
    deviation: 'Desviación',
    financialSummary: 'RESUMEN FINANCIERO',
    predictedValue: 'Importe Previsto',
    currentMeasured: 'Medición Actual',
    accumulatedMeasured: 'Medición Acumulada',
    globalProgress: 'Avance Global',
    vat: 'IVA',
    totalWithVat: 'Total c/ IVA',
    technicalObs: 'OBSERVACIONES TÉCNICAS',
    executionConditions: 'Condiciones de Ejecución',
    observations: 'Observaciones',
    nonConformities: 'No Conformidades',
    applicableStandards: 'NORMATIVA APLICABLE',
    signatures: 'FIRMAS',
    responsibleSignature: 'El Responsable de la Medición',
    inspectorSignature: 'El Director de Obra',
    clientSignature: 'El Promotor / Cliente',
    date: 'Fecha',
    generatedOn: 'Documento generado en',
    validatedOn: 'Validado en',
  },
};

export function AutoMedicaoPdfExport({ auto }: AutoMedicaoPdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'pt' | 'es'>(auto.idioma || 'pt');
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(selectedLang === 'pt' ? 'pt-PT' : 'es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(selectedLang === 'pt' ? 'pt-PT' : 'es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const generatePdf = async () => {
    setIsGenerating(true);
    const t = translations[selectedLang];
    const locale = selectedLang === 'pt' ? pt : es;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;
      let pageNum = 1;

      // Fetch company profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_nome, empresa_nif, empresa_morada, empresa_logo_url')
        .eq('id', user?.id)
        .single();

      // Helper functions
      const addNewPage = () => {
        pdf.addPage();
        pageNum++;
        yPos = margin;
        drawHeader();
      };

      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - 30) {
          addNewPage();
        }
      };

      const drawHeader = () => {
        // Header background
        pdf.setFillColor(30, 64, 175);
        pdf.rect(0, 0, pageWidth, 30, 'F');

        // Company logo placeholder or name
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(profile?.empresa_nome || 'Empresa', margin, 12);

        if (profile?.empresa_nif) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`NIF: ${profile.empresa_nif}`, margin, 18);
        }

        // Title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${t.title}`, pageWidth - margin, 12, { align: 'right' });

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${t.autoNumber} ${auto.numero_auto}`, pageWidth - margin, 20, { align: 'right' });

        // Page number
        pdf.setFontSize(8);
        pdf.text(`${t.page} ${pageNum}`, pageWidth - margin, 27, { align: 'right' });

        yPos = 38;
      };

      const drawSectionTitle = (title: string) => {
        checkPageBreak(15);
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175);
        pdf.text(title, margin + 3, yPos);
        yPos += 8;
        pdf.setTextColor(0, 0, 0);
      };

      const drawKeyValue = (key: string, value: string, x: number = margin, width: number = contentWidth) => {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${key}:`, x, yPos);
        pdf.setFont('helvetica', 'normal');
        const keyWidth = pdf.getTextWidth(`${key}: `);
        const lines = pdf.splitTextToSize(value || '-', width - keyWidth - 5);
        pdf.text(lines[0], x + keyWidth, yPos);
        yPos += 5;
      };

      // Draw initial header
      drawHeader();

      // Project Info
      drawSectionTitle(t.projectInfo);
      drawKeyValue(t.project, auto.obra?.nome || '-');
      drawKeyValue(t.location, auto.localizacao_obra || auto.obra?.localizacao || '-');
      drawKeyValue(t.period, `${format(new Date(auto.data_inicio), 'dd/MM/yyyy', { locale })} ${t.to} ${format(new Date(auto.data_fim), 'dd/MM/yyyy', { locale })}`);
      yPos += 5;

      // Measurement Info
      drawSectionTitle(t.measurementInfo);
      const col1X = margin;
      const col2X = margin + contentWidth / 2;
      
      pdf.setFontSize(9);
      drawKeyValue(t.contractRef, auto.contrato_referencia || '-', col1X, contentWidth / 2);
      yPos -= 5;
      drawKeyValue(t.phase, auto.fase_obra || '-', col2X, contentWidth / 2);
      drawKeyValue(t.zone, auto.zona_medicao || '-', col1X, contentWidth / 2);
      yPos += 5;

      // Technical Responsibility
      drawSectionTitle(t.technicalResponsibility);
      drawKeyValue(t.responsible, auto.responsavel_medicao);
      if (auto.responsavel_cargo) {
        yPos -= 5;
        drawKeyValue(t.position, auto.responsavel_cargo, col2X, contentWidth / 2);
      }
      if (auto.responsavel_ordem) {
        drawKeyValue(t.professionalOrder, auto.responsavel_ordem);
      }
      if (auto.fiscal_obra) {
        drawKeyValue(t.inspector, auto.fiscal_obra);
      }
      yPos += 5;

      // Items Table
      drawSectionTitle(t.measuredItems);
      
      const items = auto.itens || [];
      if (items.length > 0) {
        // Table header
        checkPageBreak(10);
        pdf.setFillColor(229, 231, 235);
        pdf.rect(margin, yPos - 3, contentWidth, 6, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        
        const cols = [
          { label: t.code, x: margin + 2, w: 15 },
          { label: t.description, x: margin + 18, w: 50 },
          { label: t.unit, x: margin + 70, w: 10 },
          { label: t.predicted, x: margin + 82, w: 15 },
          { label: t.current, x: margin + 98, w: 15 },
          { label: t.accumulated, x: margin + 114, w: 15 },
          { label: t.unitPrice, x: margin + 130, w: 18 },
          { label: t.currentValue, x: margin + 149, w: 20 },
          { label: t.deviation, x: margin + 170, w: 10 },
        ];

        cols.forEach(col => {
          pdf.text(col.label, col.x, yPos);
        });
        yPos += 6;

        // Table rows
        pdf.setFont('helvetica', 'normal');
        items.forEach((item) => {
          checkPageBreak(8);
          
          pdf.setFontSize(7);
          pdf.text(item.codigo.substring(0, 10), cols[0].x, yPos);
          
          const descLines = pdf.splitTextToSize(item.descricao, cols[1].w);
          pdf.text(descLines[0], cols[1].x, yPos);
          
          pdf.text(item.unidade, cols[2].x, yPos);
          pdf.text(formatNumber(item.quantidade_prevista || 0), cols[3].x, yPos);
          pdf.text(formatNumber(item.quantidade_atual || 0), cols[4].x, yPos);
          pdf.text(formatNumber(item.quantidade_acumulada || 0), cols[5].x, yPos);
          pdf.text(formatNumber(item.preco_unitario || 0), cols[6].x, yPos);
          pdf.text(formatCurrency(item.valor_atual || 0), cols[7].x, yPos);
          
          const desvio = item.desvio_percentual || 0;
          pdf.setTextColor(item.dentro_tolerancia ? 0 : 220, item.dentro_tolerancia ? 128 : 38, item.dentro_tolerancia ? 0 : 38);
          pdf.text(`${desvio.toFixed(1)}%`, cols[8].x, yPos);
          pdf.setTextColor(0, 0, 0);
          
          yPos += 5;

          // Draw separator
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.1);
          pdf.line(margin, yPos - 1, margin + contentWidth, yPos - 1);
        });
      }
      yPos += 5;

      // Financial Summary
      checkPageBreak(40);
      drawSectionTitle(t.financialSummary);
      
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPos - 2, contentWidth, 35, 3, 3, 'F');
      
      const summaryCol1 = margin + 5;
      const summaryCol2 = margin + contentWidth / 2;
      
      pdf.setFontSize(9);
      drawKeyValue(t.predictedValue, formatCurrency(auto.valor_previsto || 0), summaryCol1);
      yPos -= 5;
      drawKeyValue(t.currentMeasured, formatCurrency(auto.valor_medido_atual || 0), summaryCol2);
      drawKeyValue(t.accumulatedMeasured, formatCurrency(auto.valor_medido_acumulado || 0), summaryCol1);
      yPos -= 5;
      drawKeyValue(t.globalProgress, `${(auto.percentagem_global || 0).toFixed(1)}%`, summaryCol2);
      drawKeyValue(`${t.vat} (${auto.taxa_iva || 23}%)`, formatCurrency(auto.valor_iva || 0), summaryCol1);
      yPos -= 5;
      pdf.setFont('helvetica', 'bold');
      drawKeyValue(t.totalWithVat, formatCurrency(auto.valor_total_com_iva || 0), summaryCol2);
      pdf.setFont('helvetica', 'normal');
      yPos += 8;

      // Technical Observations
      if (auto.condicoes_execucao || auto.observacoes_tecnicas || auto.nao_conformidades) {
        checkPageBreak(30);
        drawSectionTitle(t.technicalObs);
        
        if (auto.condicoes_execucao) {
          drawKeyValue(t.executionConditions, auto.condicoes_execucao);
        }
        if (auto.observacoes_tecnicas) {
          drawKeyValue(t.observations, auto.observacoes_tecnicas);
        }
        if (auto.nao_conformidades) {
          pdf.setTextColor(220, 38, 38);
          drawKeyValue(t.nonConformities, auto.nao_conformidades);
          pdf.setTextColor(0, 0, 0);
        }
        yPos += 5;
      }

      // Signatures section
      checkPageBreak(50);
      drawSectionTitle(t.signatures);
      
      const sigWidth = (contentWidth - 20) / 3;
      const sigY = yPos + 25;
      
      // Signature boxes
      [
        { label: t.responsibleSignature, x: margin },
        { label: t.inspectorSignature, x: margin + sigWidth + 10 },
        { label: t.clientSignature, x: margin + 2 * (sigWidth + 10) },
      ].forEach(sig => {
        pdf.setDrawColor(156, 163, 175);
        pdf.setLineWidth(0.3);
        pdf.line(sig.x, sigY, sig.x + sigWidth, sigY);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(sig.label, sig.x + sigWidth / 2, sigY + 5, { align: 'center' });
      });

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(156, 163, 175);
      pdf.text(
        `${t.generatedOn} ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale })}`,
        margin,
        pageHeight - 10
      );

      if (auto.validado_em) {
        pdf.text(
          `${t.validatedOn}: ${format(new Date(auto.validado_em), "dd/MM/yyyy 'às' HH:mm", { locale })}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save PDF
      const fileName = `Auto_Medicao_${auto.numero_auto}_${auto.obra?.nome?.replace(/\s+/g, '_') || 'Obra'}_${selectedLang.toUpperCase()}.pdf`;
      pdf.save(fileName);
      
      toast.success(selectedLang === 'pt' ? 'PDF gerado com sucesso!' : '¡PDF generado con éxito!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(selectedLang === 'pt' ? 'Erro ao gerar PDF' : 'Error al generar PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedLang} onValueChange={(v: 'pt' | 'es') => setSelectedLang(v)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">🇵🇹 Português</SelectItem>
          <SelectItem value="es">🇪🇸 Español</SelectItem>
        </SelectContent>
      </Select>
      
      <Button onClick={generatePdf} disabled={isGenerating}>
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {selectedLang === 'pt' ? 'A gerar...' : 'Generando...'}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {selectedLang === 'pt' ? 'Exportar PDF' : 'Exportar PDF'}
          </>
        )}
      </Button>
    </div>
  );
}
