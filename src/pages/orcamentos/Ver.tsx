import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamento } from '@/hooks/useOrcamentos';
import { OrcamentoStatus } from '@/components/orcamentos/OrcamentoStatus';
import { EnviarOrcamentoDialog } from '@/components/orcamentos/EnviarOrcamentoDialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Printer,
  FileText,
  Building2,
  Calendar,
  Euro,
  Edit,
  Loader2,
  Phone,
  Mail,
  MapPin,
  User,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { generateOrcamentoPdf } from '@/lib/orcamento-pdf';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalEngine } from '@/hooks/useFiscalEngine';
import { CotacoesTab } from '@/components/orcamentos/CotacoesTab';

export default function VerOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orcamento, isLoading } = useOrcamento(id);
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [enviarDialogOpen, setEnviarDialogOpen] = useState(false);
   const { useOrcamentoContextoFiscal, calcularIVA, getNotaLegalPorRegime, regimes } = useFiscalEngine();
   const { data: contextoFiscal } = useOrcamentoContextoFiscal(id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
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

  // Calculate totals - IMPORTANT: Margin is applied internally but NOT shown to client
  const custosIndiretosTotal =
    (orcamento.custos_indiretos?.estaleiro || 0) +
    (orcamento.custos_indiretos?.seguros || 0) +
    (orcamento.custos_indiretos?.licenciamento || 0);

  const subtotalArtigos = orcamento.valor_total;
  const subtotalComIndiretos = subtotalArtigos + custosIndiretosTotal;
  const margemDecimal = orcamento.margem_lucro / 100;
  const valorBase = margemDecimal > 0 && margemDecimal < 1
    ? subtotalComIndiretos / (1 - margemDecimal)
    : subtotalComIndiretos;

  const taxaIVA = contextoFiscal?.taxa_iva ?? 23;
  const valorIVA = valorBase * (taxaIVA / 100);
  const valorFinal = valorBase + valorIVA;

  const notaLegal = contextoFiscal?.regime_id
    ? getNotaLegalPorRegime(contextoFiscal.regime_id)
    : null;
  const regimeNome = contextoFiscal?.regime_id
    ? regimes?.find(r => r.id === contextoFiscal.regime_id)?.nome
    : 'IVA Normal';

  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome;
  const companyNif = profile?.empresa_nif || profile?.nif;

  const handleGeneratePDF = async () => {
    toast({
      title: 'A gerar PDF...',
      description: 'Por favor aguarde',
    });

    try {
      const blob = await generateOrcamentoPdf({
        orcamento,
        profile: profile as any,
        margemDecimal,
        taxaIVA,
        valorBase,
        valorIVA,
        valorFinal,
        custosIndiretosTotal,
        subtotalArtigos,
        notaLegal,
        regimeNome,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orcamento-${orcamento.titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF gerado',
        description: 'O ficheiro foi descarregado',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout
      title={orcamento.titulo}
      subtitle="Visualização do Orçamento"
      actions={
        <div className="flex gap-2 no-print">
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
          <Button onClick={() => setEnviarDialogOpen(true)} className="bg-accent hover:bg-accent/90">
            <Send className="mr-2 h-4 w-4" />
            Enviar Orçamento
          </Button>
        </div>
      }
    >
      {/* Enviar Dialog */}
      <EnviarOrcamentoDialog
        open={enviarDialogOpen}
        onOpenChange={setEnviarDialogOpen}
        orcamentoId={orcamento.id}
        orcamentoTitulo={orcamento.titulo}
        clienteEmail={orcamento.cliente?.email}
        clienteNome={orcamento.cliente?.nome}
      />
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Reset everything */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            overflow: visible !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          #print-content, #print-content * {
            visibility: visible;
          }
          
          #print-content {
            position: relative !important;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Scale down content to fit A4 */
          #print-content {
            font-size: 10px !important;
          }
          
          #print-content h1 {
            font-size: 18px !important;
          }
          
          #print-content h2 {
            font-size: 14px !important;
          }
          
          #print-content h3, #print-content h4 {
            font-size: 12px !important;
          }
          
          /* Tables - compact for A4 */
          #print-content table {
            font-size: 9px !important;
            width: 100% !important;
          }
          
          #print-content th, #print-content td {
            padding: 3px 6px !important;
          }
          
          /* Cards - remove shadows and reduce spacing */
          #print-content .rounded-lg,
          #print-content [class*="Card"] {
            box-shadow: none !important;
            border-radius: 4px !important;
          }
          
          /* Reduce spacing between sections */
          #print-content .space-y-6 > * + * {
            margin-top: 12px !important;
          }
          
          #print-content .space-y-2 > * + * {
            margin-top: 4px !important;
          }
          
          /* Prevent page breaks inside important elements */
          #print-content .print\\:break-inside-avoid,
          #print-content .pdf-keep-together {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Keep chapter cards together when possible */
          #print-content table {
            break-inside: auto !important;
          }
          
          #print-content tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          #print-content thead {
            display: table-header-group !important;
          }
          
          /* Avoid orphaned headers */
          #print-content [class*="CardHeader"] {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          
          /* Summary section - always together */
          #print-content .border-2 {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Footer and observations */
          #print-content .bg-muted\\/30 {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Remove unnecessary padding */
          #print-content .p-6, #print-content .md\\:p-8 {
            padding: 0 !important;
          }
          
          #print-content .p-4 {
            padding: 8px !important;
          }
          
          /* Page margins */
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }
        }
        
        /* PDF generation styles - keep elements together */
        .generating-pdf .pdf-keep-together {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      `}</style>

      <div className="p-4 md:p-6">
        <Tabs defaultValue="orcamento">
          <TabsList className="mb-4 no-print">
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
            <TabsTrigger value="cotacoes">Cotações</TabsTrigger>
          </TabsList>

          <TabsContent value="cotacoes">
            <CotacoesTab orcamentoId={id!} />
          </TabsContent>

          <TabsContent value="orcamento">
        <div
          ref={printRef}
          id="print-content"
          className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-sm space-y-6"
        >
          {/* Company Header */}
          <div className="flex justify-between items-start border-b pb-6">
            <div className="flex items-start gap-4">
              {profile?.empresa_logo_url && (
                <img
                  src={profile.empresa_logo_url}
                  alt="Logo da empresa"
                  className="h-16 w-auto object-contain"
                  crossOrigin="anonymous"
                />
              )}
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {companyName}
                </h2>
                {companyNif && (
                  <p className="text-sm text-muted-foreground">NIF: {companyNif}</p>
                )}
                {profile?.empresa_morada && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.empresa_morada}
                    {profile.empresa_codigo_postal && `, ${profile.empresa_codigo_postal}`}
                    {profile.empresa_cidade && ` ${profile.empresa_cidade}`}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  {(profile?.empresa_telefone || profile?.telefone) && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {profile.empresa_telefone || profile.telefone}
                    </span>
                  )}
                  {(profile?.empresa_email || profile?.email) && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {profile.empresa_email || profile.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-primary">ORÇAMENTO</h1>
              {orcamento.codigo && (
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  {orcamento.codigo}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Data: {format(new Date(orcamento.data_criacao), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            </div>
          </div>

          {/* Budget Info + Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">{orcamento.titulo}</h3>
              {orcamento.obra && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Obra:</span>
                  <span>{orcamento.obra.nome}</span>
                </div>
              )}
            </div>
            
            {/* Client Info Section */}
            {orcamento.cliente && (
              <div className="space-y-2 border-l pl-4 md:border-l-0 md:pl-0 md:border-t-0 pt-4 md:pt-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground">Cliente</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{orcamento.cliente.nome}</p>
                  {orcamento.cliente.empresa && (
                    <p className="text-muted-foreground">{orcamento.cliente.empresa}</p>
                  )}
                  {orcamento.cliente.nif && (
                    <p className="text-muted-foreground">NIF: {orcamento.cliente.nif}</p>
                  )}
                  {orcamento.cliente.endereco && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {orcamento.cliente.endereco}
                      {orcamento.cliente.codigo_postal && `, ${orcamento.cliente.codigo_postal}`}
                      {orcamento.cliente.cidade && ` ${orcamento.cliente.cidade}`}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {(orcamento.cliente.telefone || orcamento.cliente.telemovel) && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {orcamento.cliente.telemovel || orcamento.cliente.telefone}
                      </span>
                    )}
                    {orcamento.cliente.email && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {orcamento.cliente.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Fallback to obra.cliente if no direct client */}
            {!orcamento.cliente && orcamento.obra?.cliente && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cliente:</span>
                  <span>{orcamento.obra.cliente}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end items-start md:col-span-2 md:mt-2">
              <OrcamentoStatus status={orcamento.status} />
            </div>
          </div>

          {/* Chapters and Articles */}
          <div className="space-y-6">
            {orcamento.capitulos && orcamento.capitulos.length > 0 ? (
              orcamento.capitulos.map((capitulo) => (
                <Card key={capitulo.id} className="border shadow-none print:break-inside-avoid">
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
                          {capitulo.artigos.map((artigo) => {
                            // Apply margin to unit price for display (hidden margin)
                            const precoComMargem = margemDecimal > 0 && margemDecimal < 1
                              ? artigo.preco_unitario / (1 - margemDecimal)
                              : artigo.preco_unitario;
                            const totalComMargem = artigo.quantidade * precoComMargem;
                            
                            return (
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
                                  {formatCurrency(precoComMargem)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm">
                                  {formatCurrency(totalComMargem)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        Sem artigos neste capítulo
                      </p>
                    )}
                    {/* Chapter Total - with margin applied */}
                    <div className="flex justify-end p-3 bg-muted/30 border-t">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Subtotal Capítulo:</span>
                        <span className="font-semibold">
                          {formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? (capitulo.valor_total || 0) / (1 - margemDecimal) : (capitulo.valor_total || 0))}
                        </span>
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

          {/* Summary - Shows all costs breakdown except internal margin */}
          <Card className="border-2 border-primary/20 pdf-keep-together print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Resumo do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Subtotal dos artigos (com margem aplicada) */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Artigos</span>
                  <span>{formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? subtotalArtigos / (1 - margemDecimal) : subtotalArtigos)}</span>
                </div>

                {/* Custos Indiretos - mostrar individualmente se existirem */}
                {custosIndiretosTotal > 0 && (
                  <>
                    {(orcamento.custos_indiretos?.estaleiro || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground pl-4">Estaleiro</span>
                        <span>{formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? (orcamento.custos_indiretos?.estaleiro || 0) / (1 - margemDecimal) : (orcamento.custos_indiretos?.estaleiro || 0))}</span>
                      </div>
                    )}
                    {(orcamento.custos_indiretos?.seguros || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground pl-4">Seguros</span>
                        <span>{formatCurrency((orcamento.custos_indiretos?.seguros || 0) * (1 + margemDecimal))}</span>
                      </div>
                    )}
                    {(orcamento.custos_indiretos?.licenciamento || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground pl-4">Licenciamento</span>
                        <span>{formatCurrency((orcamento.custos_indiretos?.licenciamento || 0) * (1 + margemDecimal))}</span>
                      </div>
                    )}
                  </>
                )}

                <Separator className="my-2" />

                {/* Subtotal antes do IVA */}
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
                  <span>{formatCurrency(valorBase)}</span>
                </div>

                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">IVA ({taxaIVA}%)</span>
                  <span>{formatCurrency(valorIVA)}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{formatCurrency(valorFinal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          <div className="bg-muted/30 p-4 rounded-lg text-sm space-y-2 pdf-keep-together print:break-inside-avoid">
            <h4 className="font-semibold">Observações:</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Este orçamento é válido por 30 dias a contar da data de emissão.</li>
              <li>Os preços apresentados incluem todos os materiais e mão de obra necessários.</li>
              <li>Eventuais trabalhos adicionais não contemplados serão orçamentados separadamente.</li>
              <li>Condições de pagamento a acordar.</li>
            </ul>
             {/* Legal note for fiscal compliance */}
             {notaLegal && (
               <div className="mt-3 pt-3 border-t border-border">
                 <p className="text-xs text-muted-foreground italic">
                   <strong>Nota Fiscal:</strong> {notaLegal}
                 </p>
               </div>
             )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t pdf-keep-together print:break-inside-avoid">
            <p>Documento gerado em {format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}</p>
            {companyName && <p className="mt-1">{companyName} {companyNif && `• NIF: ${companyNif}`}</p>}
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
