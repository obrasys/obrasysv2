import { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamento } from '@/hooks/useOrcamentos';
import { OrcamentoStatus } from '@/components/orcamentos/OrcamentoStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Printer,
  FileText,
  Building2,
  Calendar,
  Euro,
  Edit,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

export default function VerOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orcamento, isLoading } = useOrcamento(id);
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePDF = async () => {
    if (!printRef.current || !orcamento) return;

    toast({
      title: 'A gerar PDF...',
      description: 'Por favor aguarde',
    });

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Handle multi-page if content is too long
      const pageHeight = pdfHeight;
      const scaledHeight = (imgHeight * pdfWidth) / imgWidth;
      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`orcamento-${orcamento.titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`);

      toast({
        title: 'PDF gerado',
        description: 'O ficheiro foi descarregado',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !orcamento) {
    return (
      <AppLayout title="Carregar Orçamento...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Calculate totals
  const custosIndiretosTotal =
    (orcamento.custos_indiretos?.estaleiro || 0) +
    (orcamento.custos_indiretos?.seguros || 0) +
    (orcamento.custos_indiretos?.licenciamento || 0);

  const subtotal = orcamento.valor_total + custosIndiretosTotal;
  const margemValor = subtotal * (orcamento.margem_lucro / 100);
  const valorFinal = subtotal + margemValor;

  return (
    <AppLayout
      title={orcamento.titulo}
      subtitle="Visualização do Orçamento"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={() => navigate(`/orcamentos/${id}/editar`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleGeneratePDF}>
            <FileText className="mr-2 h-4 w-4" />
            Gerar PDF
          </Button>
        </div>
      }
    >
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="p-4 md:p-6">
        <div
          ref={printRef}
          id="print-content"
          className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-sm space-y-6"
        >
          {/* Header */}
          <div className="text-center border-b pb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              ORÇAMENTO
            </h1>
            <p className="text-lg text-muted-foreground">{orcamento.titulo}</p>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {orcamento.obra && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Obra:</span>
                  <span>{orcamento.obra.nome}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Data:</span>
                <span>
                  {format(new Date(orcamento.data_criacao), "d 'de' MMMM 'de' yyyy", {
                    locale: pt,
                  })}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <OrcamentoStatus status={orcamento.status} />
            </div>
          </div>

          <Separator />

          {/* Chapters and Articles */}
          <div className="space-y-6">
            {orcamento.capitulos && orcamento.capitulos.length > 0 ? (
              orcamento.capitulos.map((capitulo) => (
                <Card key={capitulo.id} className="border shadow-none">
                  <CardHeader className="bg-muted/50 py-3">
                    <CardTitle className="text-base font-semibold">
                      {capitulo.numero}. {capitulo.titulo}
                    </CardTitle>
                    {capitulo.descricao && (
                      <p className="text-sm text-muted-foreground">{capitulo.descricao}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {capitulo.artigos && capitulo.artigos.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[70px] text-center">Un.</TableHead>
                            <TableHead className="w-[80px] text-right">Qtd.</TableHead>
                            <TableHead className="w-[100px] text-right">P. Unit.</TableHead>
                            <TableHead className="w-[100px] text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {capitulo.artigos.map((artigo) => (
                            <TableRow key={artigo.id}>
                              <TableCell className="font-mono text-xs">
                                {artigo.codigo || '-'}
                              </TableCell>
                              <TableCell className="text-sm">{artigo.descricao}</TableCell>
                              <TableCell className="text-center text-sm">
                                {artigo.unidade}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {artigo.quantidade.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(artigo.preco_unitario)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-sm">
                                {formatCurrency(artigo.valor_total || artigo.quantidade * artigo.preco_unitario)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        Sem artigos neste capítulo
                      </p>
                    )}
                    {/* Chapter Total */}
                    <div className="flex justify-end p-3 bg-muted/30 border-t">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Subtotal Capítulo:</span>
                        <span className="font-semibold">{formatCurrency(capitulo.valor_total || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border shadow-none">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum capítulo neste orçamento
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Summary */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Resumo do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Artigos</span>
                  <span>{formatCurrency(orcamento.valor_total)}</span>
                </div>

                {custosIndiretosTotal > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Custos Indiretos
                    </div>
                    {orcamento.custos_indiretos?.estaleiro > 0 && (
                      <div className="flex justify-between text-sm pl-4">
                        <span className="text-muted-foreground">Estaleiro</span>
                        <span>{formatCurrency(orcamento.custos_indiretos.estaleiro)}</span>
                      </div>
                    )}
                    {orcamento.custos_indiretos?.seguros > 0 && (
                      <div className="flex justify-between text-sm pl-4">
                        <span className="text-muted-foreground">Seguros</span>
                        <span>{formatCurrency(orcamento.custos_indiretos.seguros)}</span>
                      </div>
                    )}
                    {orcamento.custos_indiretos?.licenciamento > 0 && (
                      <div className="flex justify-between text-sm pl-4">
                        <span className="text-muted-foreground">Licenciamento</span>
                        <span>{formatCurrency(orcamento.custos_indiretos.licenciamento)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-medium pt-1">
                      <span>Total Custos Indiretos</span>
                      <span>{formatCurrency(custosIndiretosTotal)}</span>
                    </div>
                  </>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Margem de Lucro ({orcamento.margem_lucro}%)
                  </span>
                  <span>{formatCurrency(margemValor)}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{formatCurrency(valorFinal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Documento gerado em {format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
