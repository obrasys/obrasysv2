import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamento, useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoStatus } from '@/components/orcamentos/OrcamentoStatus';
import { EnviarOrcamentoDialog } from '@/components/orcamentos/EnviarOrcamentoDialog';
import { AdjudicacaoWizard } from '@/components/orcamentos/AdjudicacaoWizard';
import { ADJUDICAVEL_STATUSES } from '@/types/orcamentos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Printer, FileText, Building2, Calendar, Euro, Edit, Loader2,
  Phone, Mail, MapPin, User, Send, Copy, GitBranch, ChevronDown, ChevronRight,
  Layers, Package, TrendingUp, AlertTriangle, Lightbulb, PackageMinus, Search,
  Zap, HardHat, MoreHorizontal, FileStack,
  LockIcon, TargetIcon, FileCheck2, History,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { generateOrcamentoPdf } from '@/lib/orcamento-pdf';
import { generateComercialPdf } from '@/lib/orcamento-pdf-comercial';
import { useBudgetDocuments } from '@/hooks/useBudgetDocuments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalEngine } from '@/hooks/useFiscalEngine';
import { CotacoesTab } from '@/components/orcamentos/CotacoesTab';
import { OrcamentoAuditPanel } from '@/components/orcamentos/OrcamentoAuditPanel';
import { BaseDryBudgetPanel } from '@/components/orcamentos/BaseDryBudgetPanel';
import { TargetBudgetPanel } from '@/components/orcamentos/TargetBudgetPanel';
import { ClosingSheetsPanel } from '@/components/orcamentos/ClosingSheetsPanel';
import { BudgetHistoryPanel } from '@/components/orcamentos/BudgetHistoryPanel';
import { ContractingPackagesPanel } from '@/components/orcamentos/ContractingPackagesPanel';
import { useOperationalLayerLabel } from '@/hooks/useOperationalLayerLabel';

export default function VerOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orcamento, isLoading } = useOrcamento(id);
  const { duplicateOrcamento, createRevisao, updateStatus } = useOrcamentos();
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [enviarDialogOpen, setEnviarDialogOpen] = useState(false);
  const [adjudicarOpen, setAdjudicarOpen] = useState(false);
  const [pdfFormatOpen, setPdfFormatOpen] = useState(false);
  const [pdfFormato, setPdfFormato] = useState<'tecnico' | 'comercial'>('tecnico');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const { useOrcamentoContextoFiscal, getNotaLegalPorRegime, regimes } = useFiscalEngine();
  const { data: contextoFiscal } = useOrcamentoContextoFiscal(id);
  const { saveDocument } = useBudgetDocuments(id);
  const { short: opLayerShort } = useOperationalLayerLabel();
  const isLocked = Boolean((orcamento as any)?.is_locked);
  const lockedAt = ((orcamento as any)?.locked_at as string | null) ?? null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  if (isLoading || !orcamento) {
    return (
      <AppLayout title="Carregar Orçamento...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // ── Calculations ──
  const custosIndiretosTotal =
    (orcamento.custos_indiretos?.estaleiro || 0) +
    (orcamento.custos_indiretos?.seguros || 0) +
    (orcamento.custos_indiretos?.licenciamento || 0);

  const subtotalArtigos = (orcamento.capitulos || []).reduce(
    (sum, cap) =>
      sum +
      (cap.artigos || []).reduce(
        (s, a) => s + (a.valor_total ?? a.quantidade * a.preco_unitario),
        0
      ),
    0
  );
  const subtotalComIndiretos = subtotalArtigos + custosIndiretosTotal;
  const margemDecimal = orcamento.margem_lucro / 100;
  const valorBase = margemDecimal > 0 && margemDecimal < 1
    ? subtotalComIndiretos / (1 - margemDecimal)
    : subtotalComIndiretos;

  // Prioridade: IVA configurado no orçamento (ex: ICF) → contexto fiscal → 23% padrão
  const ivaConfigurado = (orcamento.custos_indiretos as any)?.iva_percent;
  const taxaIVA = typeof ivaConfigurado === 'number' ? ivaConfigurado : (contextoFiscal?.taxa_iva ?? 23);
  const valorIVA = valorBase * (taxaIVA / 100);
  const valorFinal = valorBase + valorIVA;
  const lucroEstimado = valorBase - subtotalComIndiretos;

  const notaLegal = contextoFiscal?.regime_id ? getNotaLegalPorRegime(contextoFiscal.regime_id) : null;
  const regimeNome = contextoFiscal?.regime_id
    ? regimes?.find(r => r.id === contextoFiscal.regime_id)?.nome : 'IVA Normal';

  const companyName = profile?.empresa_nome || profile?.empresa || profile?.nome;
  const companyNif = profile?.empresa_nif || profile?.nif;

  const totalCapitulos = orcamento.capitulos?.length || 0;
  const totalItens = orcamento.capitulos?.reduce((s, c) => s + (c.artigos?.length || 0), 0) || 0;

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(orcamento.capitulos?.map(c => c.id) || []);
    setExpandedChapters(allIds);
  };

  const collapseAll = () => setExpandedChapters(new Set());

  const handleGeneratePDF = async () => {
    toast({ title: 'A gerar PDF...', description: 'Por favor aguarde' });
    try {
      let blob: Blob;
      if (pdfFormato === 'comercial') {
        blob = await generateComercialPdf({
          orcamento, profile: profile as any,
          valorFinal, taxaIVA, valorBase, valorIVA,
        });
      } else {
        blob = await generateOrcamentoPdf({
          orcamento, profile: profile as any,
          margemDecimal, taxaIVA, valorBase, valorIVA, valorFinal,
          custosIndiretosTotal, subtotalArtigos, notaLegal, regimeNome,
        });
      }

      // Save snapshot
      try {
        await saveDocument.mutateAsync({ budgetId: orcamento.id, viewMode: pdfFormato, blob });
      } catch { /* non-blocking */ }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orcamento-${pdfFormato}-${orcamento.titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF gerado', description: `Formato ${pdfFormato === 'tecnico' ? 'técnico' : 'comercial'} descarregado` });
      setPdfFormatOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF', variant: 'destructive' });
    }
  };

  const canAdjudicar = ADJUDICAVEL_STATUSES.includes(orcamento.status as any);

  // ── Mock Axia alerts ──
  const axiaAlerts = [
    { icon: PackageMinus, color: 'text-primary', bg: 'bg-primary/10', label: 'Possível item em falta', desc: 'Impermeabilização não encontrada nos capítulos', severity: 'Médio' },
    { icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Desvio de preço detectado', desc: 'Betão C25/30 — 23% acima da mediana', severity: 'Alto' },
    { icon: Layers, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Capítulo incompleto', desc: 'Cap. 3 — apenas 1 artigo (média: 5)', severity: 'Alto' },
    { icon: Lightbulb, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Serviço relacionado sugerido', desc: 'Considerar "Pintura exterior" no Cap. 6', severity: 'Baixo' },
    { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Incoerência técnica', desc: 'Unidade "ml" usada onde deveria ser "m²"', severity: 'Crítico' },
  ];

  return (
    <AppLayout
      title={orcamento.titulo}
      subtitle={`Orçamento ${orcamento.codigo || ''}`}
      actions={
        <div className="flex gap-2 no-print flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={() => navigate(`/orcamentos/${id}/editar`)}>
                <Edit className="w-3.5 h-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateOrcamento.mutateAsync(orcamento.id)}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createRevisao.mutateAsync(orcamento.id).then(r => navigate(`/orcamentos/${r.id}/editar`))}>
                <GitBranch className="w-3.5 h-3.5 mr-2" /> Criar Revisão
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPdfFormatOpen(true)}>
                <FileText className="w-3.5 h-3.5 mr-2" /> Gerar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-2" /> Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEnviarDialogOpen(true)}>
                <Send className="w-3.5 h-3.5 mr-2" /> Enviar
              </DropdownMenuItem>
              {canAdjudicar && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAdjudicarOpen(true)}>
                    <HardHat className="w-3.5 h-3.5 mr-2" /> Adjudicar Orçamento
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <EnviarOrcamentoDialog
        open={enviarDialogOpen} onOpenChange={setEnviarDialogOpen}
        orcamentoId={orcamento.id} orcamentoTitulo={orcamento.titulo}
        clienteEmail={orcamento.cliente?.email} clienteNome={orcamento.cliente?.nome}
      />
      {/* PDF Format Selector Dialog */}
      <Dialog open={pdfFormatOpen} onOpenChange={setPdfFormatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Gerar PDF
            </DialogTitle>
            <DialogDescription>Escolha o formato do documento.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={pdfFormato} onValueChange={(v) => setPdfFormato(v as 'tecnico' | 'comercial')} className="grid grid-cols-1 gap-3 py-2">
            <label className={`flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all ${pdfFormato === 'tecnico' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}>
              <RadioGroupItem value="tecnico" />
              <div>
                <div className="flex items-center gap-1.5">
                  <FileStack className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Completo Técnico</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Capítulos, artigos, quantidades, preços unitários e subtotais</p>
              </div>
            </label>
            <label className={`flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all ${pdfFormato === 'comercial' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}>
              <RadioGroupItem value="comercial" />
              <div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Comercial Resumido</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Proposta narrativa com resumo por capítulo, sem detalhe técnico</p>
              </div>
            </label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfFormatOpen(false)}>Cancelar</Button>
            <Button onClick={handleGeneratePDF}>
              <FileText className="mr-2 h-4 w-4" /> Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {canAdjudicar && (
        <AdjudicacaoWizard
          open={adjudicarOpen}
          onOpenChange={setAdjudicarOpen}
          orcamento={orcamento as any}
          valorFinal={valorFinal}
        />
      )}

      <div className="p-4 md:p-6">
        <Tabs defaultValue="orcamento">
          <TabsList className="mb-4 no-print flex flex-wrap h-auto">
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
            <TabsTrigger value="base">
              <LockIcon className="h-3 w-3 mr-1.5" /> Base Seco
            </TabsTrigger>
            <TabsTrigger value="target">
              <TargetIcon className="h-3 w-3 mr-1.5" /> {opLayerShort}
            </TabsTrigger>
            <TabsTrigger value="fecho">
              <FileCheck2 className="h-3 w-3 mr-1.5" /> Fecho Económico
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History className="h-3 w-3 mr-1.5" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="cotacoes">Cotações</TabsTrigger>
          </TabsList>

          <TabsContent value="base">
            <BaseDryBudgetPanel
              orcamentoId={orcamento.id}
              isLocked={isLocked}
              lockedAt={lockedAt}
              status={orcamento.status}
              valorBase={valorBase}
            />
          </TabsContent>

          <TabsContent value="target">
            <TargetBudgetPanel orcamentoId={orcamento.id} />
          </TabsContent>

          <TabsContent value="fecho">
            <ClosingSheetsPanel orcamentoId={orcamento.id} />
          </TabsContent>

          <TabsContent value="historico">
            <BudgetHistoryPanel orcamentoId={orcamento.id} />
          </TabsContent>

          <TabsContent value="cotacoes">
            <CotacoesTab orcamentoId={id!} />
          </TabsContent>


          <TabsContent value="orcamento">
            <div className="space-y-5">
              {/* ── KPI Strip ── */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                {[
                  { icon: Euro, label: 'Valor Final', value: formatCurrency(valorFinal), bg: 'bg-primary/10', ic: 'text-primary' },
                  { icon: TrendingUp, label: 'Margem', value: `${orcamento.margem_lucro}%`, bg: 'bg-emerald-500/10', ic: 'text-emerald-600' },
                  { icon: Layers, label: 'Capítulos', value: String(totalCapitulos), bg: 'bg-amber-500/10', ic: 'text-amber-600' },
                  { icon: Package, label: 'Itens', value: String(totalItens), bg: 'bg-purple-500/10', ic: 'text-purple-600' },
                  { icon: Calendar, label: 'Atualizado', value: format(new Date(orcamento.updated_at), 'dd/MM/yy', { locale: pt }), bg: 'bg-primary/10', ic: 'text-primary' },
                ].map((k, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 pb-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.bg}`}>
                        <k.icon className={`w-4.5 h-4.5 ${k.ic}`} />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none">{k.value}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{k.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ── Info bar ── */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <OrcamentoStatus status={orcamento.status} />
                    {orcamento.obra && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" /> {orcamento.obra.nome}
                      </span>
                    )}
                    {orcamento.cliente && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5" /> {orcamento.cliente.nome}
                        {orcamento.cliente.nif && <span className="text-xs">• NIF: {orcamento.cliente.nif}</span>}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(orcamento.data_criacao), "d MMM yyyy", { locale: pt })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* ── Main Content: Chapters + Sidebar ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ── Left: Chapters (2/3) ── */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> Capítulos e Artigos
                    </h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={expandAll}>Expandir tudo</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={collapseAll}>Recolher</Button>
                    </div>
                  </div>

                  {orcamento.capitulos && orcamento.capitulos.length > 0 ? (
                    orcamento.capitulos.map((capitulo) => {
                      const isOpen = expandedChapters.has(capitulo.id);
                      const capRaw = (capitulo.artigos || []).reduce(
                        (acc, a) => acc + (a.valor_total ?? a.quantidade * a.preco_unitario),
                        0
                      );
                      const capValor = margemDecimal > 0 && margemDecimal < 1
                        ? capRaw / (1 - margemDecimal)
                        : capRaw;

                      return (
                        <Collapsible key={capitulo.id} open={isOpen} onOpenChange={() => toggleChapter(capitulo.id)}>
                          <Card className="overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                  <div>
                                    <span className="text-sm font-semibold">{capitulo.numero}. {capitulo.titulo}</span>
                                    {capitulo.descricao && <p className="text-xs text-muted-foreground mt-0.5">{capitulo.descricao}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="text-xs">{capitulo.artigos?.length || 0} itens</Badge>
                                  <span className="text-sm font-semibold whitespace-nowrap">{formatCurrency(capValor)}</span>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {capitulo.artigos && capitulo.artigos.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs w-[70px]">Código</TableHead>
                                      <TableHead className="text-xs">Descrição</TableHead>
                                      <TableHead className="text-xs w-[50px] text-center">Un.</TableHead>
                                      <TableHead className="text-xs w-[60px] text-right">Qtd.</TableHead>
                                      <TableHead className="text-xs w-[90px] text-right">P.Unit.</TableHead>
                                      <TableHead className="text-xs w-[90px] text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {capitulo.artigos.map((artigo) => {
                                      const precoComMargem = margemDecimal > 0 && margemDecimal < 1
                                        ? artigo.preco_unitario / (1 - margemDecimal)
                                        : artigo.preco_unitario;
                                      const totalComMargem = artigo.quantidade * precoComMargem;
                                      return (
                                        <TableRow key={artigo.id}>
                                          <TableCell className="font-mono text-xs text-muted-foreground">{artigo.codigo || '—'}</TableCell>
                                          <TableCell className="text-sm">{artigo.descricao}</TableCell>
                                          <TableCell className="text-center text-xs">{artigo.unidade}</TableCell>
                                          <TableCell className="text-right text-sm">{artigo.quantidade.toFixed(2)}</TableCell>
                                          <TableCell className="text-right text-sm">{formatCurrency(precoComMargem)}</TableCell>
                                          <TableCell className="text-right font-medium text-sm">{formatCurrency(totalComMargem)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="p-4 text-sm text-muted-foreground text-center">Sem artigos neste capítulo</p>
                              )}
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">Nenhum capítulo neste orçamento</CardContent>
                    </Card>
                  )}
                </div>

                {/* ── Right: Financial Summary + Axia (1/3) ── */}
                <div className="space-y-4">
                  {/* Financial summary */}
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Euro className="h-4 w-4 text-primary" /> Resumo Financeiro
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal Artigos</span>
                        <span>{formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? subtotalArtigos / (1 - margemDecimal) : subtotalArtigos)}</span>
                      </div>
                      {custosIndiretosTotal > 0 && (
                        <>
                          {(orcamento.custos_indiretos?.estaleiro || 0) > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground pl-3">Estaleiro</span>
                              <span>{formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? (orcamento.custos_indiretos.estaleiro || 0) / (1 - margemDecimal) : (orcamento.custos_indiretos.estaleiro || 0))}</span>
                            </div>
                          )}
                          {(orcamento.custos_indiretos?.seguros || 0) > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground pl-3">Seguros</span>
                              <span>{formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? (orcamento.custos_indiretos.seguros || 0) / (1 - margemDecimal) : (orcamento.custos_indiretos.seguros || 0))}</span>
                            </div>
                          )}
                          {(orcamento.custos_indiretos?.licenciamento || 0) > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground pl-3">Licenciamento</span>
                              <span>{formatCurrency(margemDecimal > 0 && margemDecimal < 1 ? (orcamento.custos_indiretos.licenciamento || 0) / (1 - margemDecimal) : (orcamento.custos_indiretos.licenciamento || 0))}</span>
                            </div>
                          )}
                        </>
                      )}
                      <Separator />
                      <div className="flex justify-between text-sm font-medium">
                        <span>Subtotal (s/ IVA)</span>
                        <span>{formatCurrency(valorBase)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA ({taxaIVA}%)</span>
                        <span>{formatCurrency(valorIVA)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold pt-1">
                        <span>TOTAL</span>
                        <span className="text-primary">{formatCurrency(valorFinal)}</span>
                      </div>

                      {/* Internal-only info */}
                      <div className="mt-3 pt-3 border-t border-dashed space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Apenas interno</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Custo Real</span>
                          <span>{formatCurrency(subtotalComIndiretos)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Lucro Estimado</span>
                          <span className="text-emerald-600 font-semibold">{formatCurrency(lucroEstimado)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Regime Fiscal</span>
                          <span className="font-medium">{regimeNome}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Auditoria do Orçamento */}
                  <OrcamentoAuditPanel
                    orcamento={orcamento}
                    margemDecimal={margemDecimal}
                    taxaIVA={taxaIVA}
                    custosIndiretosTotal={custosIndiretosTotal}
                  />

                  {/* Axia Alerts */}
                  <Card className="border-primary/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> Alertas Axia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0">
                      {axiaAlerts.map((alert, i) => (
                        <div key={i} className="flex items-start gap-2.5 py-2.5 border-b last:border-0 border-border/40">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${alert.bg}`}>
                            <alert.icon className={`w-3.5 h-3.5 ${alert.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">{alert.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug">{alert.desc}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{alert.severity}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Quick actions */}
                  <Card>
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <Button className="w-full" size="sm" onClick={() => navigate(`/orcamentos/${id}/editar`)}>
                        <Edit className="w-3.5 h-3.5 mr-2" /> Editar Orçamento
                      </Button>
                      <Button variant="outline" className="w-full" size="sm" onClick={() => setPdfFormatOpen(true)}>
                        <FileText className="w-3.5 h-3.5 mr-2" /> Gerar PDF
                      </Button>
                      <Button variant="outline" className="w-full" size="sm" onClick={() => setEnviarDialogOpen(true)}>
                        <Send className="w-3.5 h-3.5 mr-2" /> Enviar ao Cliente
                      </Button>
                      {canAdjudicar && (
                        <Button className="w-full bg-primary hover:bg-primary/90" size="sm" onClick={() => setAdjudicarOpen(true)}>
                          <HardHat className="w-3.5 h-3.5 mr-2" /> Adjudicar Orçamento
                        </Button>
                      )}
                      {orcamento.status === 'adjudicado' && (
                        <Badge className="w-full justify-center py-1.5 bg-purple-100 text-purple-700">
                          Orçamento Adjudicado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ── Observations ── */}
              <Card className="bg-muted/30">
                <CardContent className="py-4 text-sm space-y-2">
                  <h4 className="font-semibold">Observações:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                    <li>Orçamento válido por 30 dias a contar da data de emissão.</li>
                    <li>Preços incluem materiais e mão de obra necessários.</li>
                    <li>Trabalhos adicionais serão orçamentados separadamente.</li>
                    <li>Condições de pagamento a acordar.</li>
                  </ul>
                  {notaLegal && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground italic">
                        <strong>Nota Fiscal:</strong> {notaLegal}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
