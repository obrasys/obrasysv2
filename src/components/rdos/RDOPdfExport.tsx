import { useState } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { RelatorioDiario, CONDICOES_METEOROLOGICAS } from '@/types/rdos';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

interface RDOPdfExportProps {
  rdo: RelatorioDiario;
}

const getCondLabel = (value: string | null) => {
  if (!value) return 'Não registado';
  const cond = CONDICOES_METEOROLOGICAS.find(c => c.value === value);
  return cond?.label?.replace(/^[^\s]+\s/, '') || value; // Remove emoji prefix
};

const getSignedUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const { data } = await supabase.storage
    .from('rdo-fotos')
    .createSignedUrl(path, 3600);
  
  return data?.signedUrl || null;
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

export function RDOPdfExport({ rdo }: RDOPdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Helper functions
      const addNewPageIfNeeded = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const drawSectionTitle = (title: string) => {
        addNewPageIfNeeded(15);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175); // Blue
        pdf.text(title, margin, yPos);
        yPos += 2;
        pdf.setDrawColor(30, 64, 175);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, margin + contentWidth, yPos);
        yPos += 6;
        pdf.setTextColor(0, 0, 0);
      };

      const drawText = (text: string, maxWidth: number = contentWidth) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin, yPos);
          yPos += 5;
        });
      };

      const drawKeyValue = (key: string, value: string) => {
        addNewPageIfNeeded(8);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${key}:`, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        const keyWidth = pdf.getTextWidth(`${key}: `);
        pdf.text(value, margin + keyWidth, yPos);
        yPos += 6;
      };

      // Header
      pdf.setFillColor(30, 64, 175);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório Diário de Obra', margin, 15);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(rdo.obra?.nome || 'Obra', margin, 23);
      
      pdf.setFontSize(10);
      const dateFormatted = format(new Date(rdo.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
      pdf.text(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1), margin, 30);

      // Status badge
      const statusLabels: Record<string, string> = {
        rascunho: 'Rascunho',
        submetido: 'Submetido',
        aprovado: 'Aprovado',
      };
      pdf.setFillColor(rdo.status === 'aprovado' ? 34 : rdo.status === 'submetido' ? 59 : 107, 
                       rdo.status === 'aprovado' ? 197 : rdo.status === 'submetido' ? 130 : 114, 
                       rdo.status === 'aprovado' ? 94 : rdo.status === 'submetido' ? 246 : 128);
      pdf.roundedRect(pageWidth - margin - 25, 10, 25, 8, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.text(statusLabels[rdo.status] || rdo.status, pageWidth - margin - 22, 15.5);

      yPos = 45;
      pdf.setTextColor(0, 0, 0);

      // Meta information section
      drawSectionTitle('Informações Gerais');
      
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPos - 2, contentWidth, 22, 2, 2, 'F');
      
      const colWidth = contentWidth / 3;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Data', margin + 5, yPos + 4);
      pdf.text('Condições Meteorológicas', margin + colWidth + 5, yPos + 4);
      pdf.text('Mão de Obra', margin + 2 * colWidth + 5, yPos + 4);
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(format(new Date(rdo.data), 'dd/MM/yyyy'), margin + 5, yPos + 12);
      pdf.text(getCondLabel(rdo.condicoes_meteorologicas), margin + colWidth + 5, yPos + 12);
      pdf.text(`${rdo.mao_de_obra_presente || 0} trabalhadores`, margin + 2 * colWidth + 5, yPos + 12);
      
      yPos += 28;

      // Trabalhos Executados
      if (rdo.trabalhos_executados) {
        drawSectionTitle('Trabalhos Executados');
        drawText(rdo.trabalhos_executados);
        yPos += 5;
      }

      // Trabalhos Quantificados
      if (rdo.trabalhos_quantificados && rdo.trabalhos_quantificados.length > 0) {
        drawSectionTitle('Trabalhos Quantificados');
        
        // Table header
        pdf.setFillColor(243, 244, 246);
        addNewPageIfNeeded(10);
        pdf.roundedRect(margin, yPos - 2, contentWidth, 8, 1, 1, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Descrição', margin + 3, yPos + 3);
        pdf.text('Quantidade', pageWidth - margin - 30, yPos + 3);
        yPos += 10;

        rdo.trabalhos_quantificados.forEach((trabalho) => {
          addNewPageIfNeeded(8);
          pdf.setFont('helvetica', 'normal');
          const descLines = pdf.splitTextToSize(trabalho.descricao, contentWidth - 45);
          pdf.text(descLines[0], margin + 3, yPos);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${trabalho.quantidade} ${trabalho.unidade}`, pageWidth - margin - 30, yPos);
          yPos += 6;
          
          // Draw separator line
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.line(margin, yPos - 1, margin + contentWidth, yPos - 1);
        });
        yPos += 5;
      }

      // Ocorrências
      if (rdo.ocorrencias) {
        drawSectionTitle('Ocorrências');
        drawText(rdo.ocorrencias);
        yPos += 5;
      }

      // Observações
      if (rdo.observacoes) {
        drawSectionTitle('Observações');
        drawText(rdo.observacoes);
        yPos += 5;
      }

      // Photos
      if (rdo.fotos && rdo.fotos.length > 0) {
        drawSectionTitle(`Registo Fotográfico (${rdo.fotos.length} fotos)`);
        
        const photoWidth = (contentWidth - 10) / 2;
        const photoHeight = 60;
        let photoX = margin;
        let photoCount = 0;

        for (const fotoPath of rdo.fotos) {
          const signedUrl = await getSignedUrl(fotoPath);
          if (!signedUrl) continue;

          const base64 = await loadImageAsBase64(signedUrl);
          if (!base64) continue;

          addNewPageIfNeeded(photoHeight + 10);

          try {
            pdf.addImage(base64, 'JPEG', photoX, yPos, photoWidth, photoHeight, undefined, 'MEDIUM');
            
            // Photo border
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(photoX, yPos, photoWidth, photoHeight, 2, 2, 'S');
          } catch (imgError) {
            // Draw placeholder if image fails
            pdf.setFillColor(243, 244, 246);
            pdf.roundedRect(photoX, yPos, photoWidth, photoHeight, 2, 2, 'F');
            pdf.setFontSize(8);
            pdf.setTextColor(156, 163, 175);
            pdf.text('Imagem indisponível', photoX + photoWidth/2 - 15, yPos + photoHeight/2);
            pdf.setTextColor(0, 0, 0);
          }

          photoCount++;
          if (photoCount % 2 === 0) {
            yPos += photoHeight + 5;
            photoX = margin;
          } else {
            photoX = margin + photoWidth + 10;
          }
        }

        // If odd number of photos, move yPos down
        if (photoCount % 2 !== 0) {
          yPos += photoHeight + 5;
        }
      }

      // Footer with metadata
      addNewPageIfNeeded(25);
      yPos = pageHeight - 25;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, margin + contentWidth, yPos);
      yPos += 5;
      
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Criado em: ${format(new Date(rdo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, margin, yPos);
      
      if (rdo.aprovado_em) {
        pdf.text(`Aprovado em: ${format(new Date(rdo.aprovado_em), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, margin, yPos + 4);
      }
      
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`, pageWidth - margin - 45, yPos);

      // Save PDF
      const fileName = `RDO_${rdo.obra?.nome?.replace(/\s+/g, '_') || 'Obra'}_${format(new Date(rdo.data), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={generatePdf} 
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          A gerar...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}
