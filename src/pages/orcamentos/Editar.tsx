import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamento, useOrcamentos } from '@/hooks/useOrcamentos';
import { useClientes } from '@/hooks/useClientes';
import { OrcamentoStatus } from '@/components/orcamentos/OrcamentoStatus';
import { CapituloAccordion } from '@/components/orcamentos/CapituloAccordion';
import { ArtigoForm } from '@/components/orcamentos/ArtigoForm';
import { CatalogoModal } from '@/components/orcamentos/CatalogoModal';
import { ResumoTotal } from '@/components/orcamentos/ResumoTotal';
import { ParametricMeasurements } from '@/components/parametric';
import { SmartInsightsPanel } from '@/components/orcamentos/SmartInsightsPanel';
import { AxiaStatusBadge } from '@/components/axia/AxiaStatusBadge';
import { useAIBudgetInsights } from '@/hooks/useAIBudgetInsights';
import { AdjudicacaoWizard } from '@/components/orcamentos/AdjudicacaoWizard';
import { ADJUDICAVEL_STATUSES } from '@/types/orcamentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { CapituloFormData, ArtigoFormData } from '@/types/orcamentos';
 import type { TipoObraFiscal, TipoClienteFiscal, TipoOperacaoFiscal } from '@/types/fiscal';
 import {
   TIPO_OBRA_FISCAL_CONFIG,
   TIPO_CLIENTE_FISCAL_CONFIG,
   TIPO_OPERACAO_FISCAL_CONFIG,
 } from '@/types/fiscal';
import {
  Plus,
  Send,
  FileText,
  Loader2,
  CheckCircle,
  FileStack,
  Ruler,
  Euro,
  Scale,
  Info,
  Eye,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
 import { useFiscalEngine } from '@/hooks/useFiscalEngine';

export default function EditarOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';
  const { toast } = useToast();
  const { updateStatus, updateOrcamento } = useOrcamentos();
  const {
    orcamento,
    isLoading,
    createCapitulo,
    updateCapitulo,
    deleteCapitulo,
    createArtigo,
    updateArtigo,
    deleteArtigo,
    addArtigosFromCatalog,
  } = useOrcamento(id);

   // Clientes for finalization
   const { clientesAtivos } = useClientes();

   // Fiscal engine
   const { 
     useOrcamentoContextoFiscal, 
     saveContextoFiscal, 
     determinarRegimeFiscal,
   } = useFiscalEngine();
   const { data: contextoFiscal } = useOrcamentoContextoFiscal(id);

   // Axia insights for status badge
   const { counts: axiaCounts, isLoading: axiaLoading } = useAIBudgetInsights(id);
 
   // Fiscal form state
   const [tipoObra, setTipoObra] = useState<TipoObraFiscal | undefined>(undefined);
   const [tipoCliente, setTipoCliente] = useState<TipoClienteFiscal | undefined>(undefined);
   const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoFiscal | undefined>(undefined);
   const [manualTaxa, setManualTaxa] = useState<number | null>(null);
 
   // Local editable margin state
   const [localMargemLucro, setLocalMargemLucro] = useState<number | null>(null);
   const activeMargemLucro = localMargemLucro ?? orcamento?.margem_lucro ?? 15;

   // Modal states
  const [showCapituloModal, setShowCapituloModal] = useState(false);
  const [showArtigoModal, setShowArtigoModal] = useState(false);
  const [showCatalogoModal, setShowCatalogoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdjudicarModal, setShowAdjudicarModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [finalizarClienteId, setFinalizarClienteId] = useState<string>('');
  const [deleteCapituloId, setDeleteCapituloId] = useState<string | null>(null);
  const [deleteArtigoId, setDeleteArtigoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('artigos');

  // Form states
  const [selectedCapituloId, setSelectedCapituloId] = useState<string | null>(null);
  const [editingArtigo, setEditingArtigo] = useState<{ id: string; capituloId: string } | null>(null);
  const [capituloForm, setCapituloForm] = useState<CapituloFormData>({
    numero: 1,
    titulo: '',
    descricao: '',
  });
  const [editingCapitulo, setEditingCapitulo] = useState<string | null>(null);

   // Fiscal context helpers
   const handleOpenSettings = () => {
     if (contextoFiscal) {
       setTipoObra(contextoFiscal.tipo_obra as TipoObraFiscal | undefined);
       setTipoCliente(contextoFiscal.tipo_cliente as TipoClienteFiscal | undefined);
       setTipoOperacao(contextoFiscal.tipo_operacao as TipoOperacaoFiscal | undefined);
     }
     setShowSettingsModal(true);
   };
 
   const fiscalPreview = determinarRegimeFiscal({
     tipo_obra: tipoObra || null,
     tipo_cliente: tipoCliente || null,
     tipo_operacao: tipoOperacao || null,
   });
 
    const handleSaveFiscalContext = async () => {
      if (!id) return;
      await saveContextoFiscal.mutateAsync({
        orcamentoId: id,
        tipoObra: tipoObra || null,
        tipoCliente: tipoCliente || null,
        tipoOperacao: tipoOperacao || null,
        manualTaxa: manualTaxa,
      });
    };
 
  if (isLoading || !orcamento) {
    if (isEmbed) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <AppLayout title="Carregar Orçamento...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isLocked = Boolean((orcamento as any)?.is_locked);
  const isBaseLocked = Boolean((orcamento as any)?.is_base_locked);
  const isReadOnly = orcamento.status === 'adjudicado' || isLocked || isBaseLocked;

  const handleAddCapitulo = () => {
    const nextNumero = (orcamento.capitulos?.length || 0) + 1;
    setCapituloForm({ numero: nextNumero, titulo: '', descricao: '' });
    setEditingCapitulo(null);
    setShowCapituloModal(true);
  };

  const handleEditCapitulo = (capituloId: string) => {
    const cap = orcamento.capitulos?.find((c) => c.id === capituloId);
    if (cap) {
      setCapituloForm({ numero: cap.numero, titulo: cap.titulo, descricao: cap.descricao || '' });
      setEditingCapitulo(capituloId);
      setShowCapituloModal(true);
    }
  };

  const handleSaveCapitulo = async () => {
    if (!capituloForm.titulo.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingCapitulo) {
      await updateCapitulo.mutateAsync({ capituloId: editingCapitulo, ...capituloForm });
    } else {
      await createCapitulo.mutateAsync(capituloForm);
    }
    setShowCapituloModal(false);
  };

  const handleDeleteCapitulo = async () => {
    if (deleteCapituloId) {
      await deleteCapitulo.mutateAsync(deleteCapituloId);
      setDeleteCapituloId(null);
    }
  };

  const handleAddArtigo = (capituloId: string) => {
    setSelectedCapituloId(capituloId);
    setEditingArtigo(null);
    setShowArtigoModal(true);
  };

  const handleEditArtigo = (artigoId: string, capituloId: string) => {
    setSelectedCapituloId(capituloId);
    setEditingArtigo({ id: artigoId, capituloId });
    setShowArtigoModal(true);
  };

  const handleSaveArtigo = async (data: ArtigoFormData) => {
    if (editingArtigo) {
      await updateArtigo.mutateAsync({ artigoId: editingArtigo.id, ...data });
    } else if (selectedCapituloId) {
      await createArtigo.mutateAsync({ capituloId: selectedCapituloId, ...data });
    }
    setShowArtigoModal(false);
  };

  const handleDeleteArtigo = async () => {
    if (deleteArtigoId) {
      await deleteArtigo.mutateAsync(deleteArtigoId);
      setDeleteArtigoId(null);
    }
  };

  const handleOpenCatalog = (capituloId: string) => {
    setSelectedCapituloId(capituloId);
    setShowCatalogoModal(true);
  };

  const handleAddFromCatalog = async (artigos: ArtigoFormData[]) => {
    if (selectedCapituloId) {
      await addArtigosFromCatalog.mutateAsync({ capituloId: selectedCapituloId, artigos });
    }
  };

  const handleOpenFinalizar = () => {
    // Pre-select current client if exists
    setFinalizarClienteId(orcamento.cliente_id || '');
    setShowFinalizarModal(true);
  };

  const handleFinalizar = async () => {
    // Validate client
    const cliente = clientesAtivos?.find(c => c.id === finalizarClienteId);
    if (!cliente) {
      toast({ title: 'Erro', description: 'Selecione um cliente para finalizar', variant: 'destructive' });
      return;
    }
    const missing: string[] = [];
    if (!cliente.email) missing.push('email');
    if (!cliente.telefone && !cliente.telemovel) missing.push('telefone');
    if (!cliente.endereco) missing.push('morada');
    if (missing.length > 0) {
      toast({ title: 'Cliente incompleto', description: `Falta: ${missing.join(', ')}. Edite o cliente primeiro.`, variant: 'destructive' });
      return;
    }

    // Save client to orcamento if changed
    if (finalizarClienteId !== orcamento.cliente_id) {
      await updateOrcamento.mutateAsync({ id: orcamento.id, cliente_id: finalizarClienteId });
    }

    await updateStatus.mutateAsync({
      id: orcamento.id,
      status: 'enviado',
      data_envio: new Date().toISOString(),
    });
    setShowFinalizarModal(false);
    toast({ title: 'Sucesso', description: 'Orçamento enviado ao cliente' });
  };

  // Adjudicação now handled by the wizard component

  const getArtigoDefaults = (): Partial<ArtigoFormData> | undefined => {
    if (editingArtigo) {
      const cap = orcamento.capitulos?.find((c) => c.id === editingArtigo.capituloId);
      const art = cap?.artigos?.find((a) => a.id === editingArtigo.id);
      if (art) {
        const a = art as any;
        return {
          codigo: art.codigo || '',
          descricao: art.descricao,
          unidade: art.unidade,
          quantidade: art.quantidade,
          preco_base: a.preco_base ?? art.preco_unitario,
          margem_lucro_artigo: a.margem_lucro_artigo ?? 0,
          preco_unitario: art.preco_unitario,
          custo_mo: a.custo_mo ?? 0,
          custo_mat: a.custo_mat ?? 0,
          custo_sub: a.custo_sub ?? 0,
          custo_srv: a.custo_srv ?? 0,
          custo_alu: a.custo_alu ?? 0,
          custo_div: a.custo_div ?? 0,
          quantity_source: a.quantity_source ?? 'manual',
          linked_element_id: a.linked_element_id ?? null,
          linked_rule_id: a.linked_rule_id ?? null,
        };
      }
    }
    return undefined;
  };

  // Header actions
  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => navigate(`/orcamentos/${id}`)}>
        <Eye className="mr-2 h-4 w-4" />
        Ver Orçamento
      </Button>
      {orcamento.status === 'rascunho' && (
        <Button onClick={handleOpenFinalizar}>
          <Send className="mr-2 h-4 w-4" />
          Finalizar
        </Button>
      )}
      {ADJUDICAVEL_STATUSES.includes(orcamento.status as any) && (
        <Button
          onClick={() => setShowAdjudicarModal(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Adjudicar
        </Button>
      )}
    </>
  );

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    isEmbed ? (
      <div className="bg-background">{children}</div>
    ) : (
      <AppLayout
        title={orcamento.titulo}
        subtitle={orcamento.obra ? `Obra: ${orcamento.obra.nome}` : undefined}
        actions={headerActions}
      >
        {children}
      </AppLayout>
    );

  return (
    <Wrapper>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Status badge + Axia */}
        <div className="mb-3 md:mb-4 flex items-center gap-3 flex-wrap">
          <OrcamentoStatus status={orcamento.status} />
          <AxiaStatusBadge
            criticalCount={axiaCounts.margin}
            warnCount={axiaCounts.outlier + axiaCounts.missing}
            total={axiaCounts.total}
            isLoading={axiaLoading}
          />
        </div>

        {(isLocked || isBaseLocked) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {isBaseLocked ? 'Orçamento Base bloqueado pela Folha de Fecho Base' : 'Orçamento bloqueado (Base Seco)'}
              </p>
              <p className="text-amber-800 dark:text-amber-300 mt-1">
                {isBaseLocked
                  ? 'Esta é a fotografia inicial da obra e não pode ser alterada. Para reorçamentar, cria uma nova versão dentro do Budget.'
                  : (orcamento as any).locked_reason || 'Este orçamento foi aprovado e congelado. Para adicionar ou alterar capítulos e artigos, utilize o Budget Objetivo.'}
              </p>
            </div>
          </div>
        )}


        {/* Tabs */}
         <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
           <TabsList className="grid w-full max-w-2xl grid-cols-4">
             <TabsTrigger value="artigos" className="flex items-center gap-2">
               <FileStack className="h-4 w-4" />
               Artigos
             </TabsTrigger>
             <TabsTrigger value="margem" className="flex items-center gap-2">
               <Euro className="h-4 w-4" />
               Margem & IVA
             </TabsTrigger>
             <TabsTrigger value="comercial" className="flex items-center gap-2">
               <FileText className="h-4 w-4" />
               Comercial
             </TabsTrigger>
             <TabsTrigger value="medicoes" className="flex items-center gap-2">
               <Ruler className="h-4 w-4" />
               Medições
             </TabsTrigger>
           </TabsList>

           {/* Tab: Artigos */}
           <TabsContent value="artigos" className="space-y-0">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
               {/* Main Content */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Plantas e Quantitativos */}
                  {!isReadOnly && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-semibold text-sm">Plantas e Quantitativos</p>
                          <p className="text-xs text-muted-foreground">
                            Carregue uma planta (PDF ou imagem) e gere artigos automaticamente para este orçamento.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/orcamentos/${orcamento.id}/plantas`)}>
                          Abrir Plantas
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  {/* Capítulos */}
                  {orcamento.capitulos && orcamento.capitulos.length > 0 ? (
                   orcamento.capitulos.map((capitulo) => (
                     <CapituloAccordion
                       key={capitulo.id}
                       capitulo={capitulo}
                       onEdit={() => handleEditCapitulo(capitulo.id)}
                       onDelete={() => setDeleteCapituloId(capitulo.id)}
                       onAddArtigo={() => handleAddArtigo(capitulo.id)}
                       onEditArtigo={(artigoId) => handleEditArtigo(artigoId, capitulo.id)}
                       onDeleteArtigo={setDeleteArtigoId}
                       onOpenCatalog={handleOpenCatalog}
                       onUpdateCommercial={(capId, data) => updateCapitulo.mutateAsync({ capituloId: capId, ...data })}
                       onUpdateDiscount={(capId, descontoPct) => updateCapitulo.mutateAsync({ capituloId: capId, desconto_pct: descontoPct })}
                       isReadOnly={isReadOnly}
                     />
                   ))
                 ) : (
                   <Card>
                     <CardContent className="py-12 text-center">
                       <p className="text-muted-foreground mb-4">
                         Nenhum capítulo criado. Adicione o primeiro capítulo para começar.
                       </p>
                     </CardContent>
                   </Card>
                 )}

                 {/* Add Chapter Button */}
                 {!isReadOnly && (
                   <Button variant="outline" className="w-full" onClick={handleAddCapitulo}>
                     <Plus className="mr-2 h-4 w-4" />
                     Adicionar Capítulo
                   </Button>
                 )}
               </div>

               {/* Sidebar */}
               <div className="space-y-4">
                 <ResumoTotal orcamento={{...orcamento, margem_lucro: activeMargemLucro}} />
                 <SmartInsightsPanel budgetId={orcamento.id} />
               </div>
             </div>
           </TabsContent>

           {/* Tab: Margem & IVA */}
           <TabsContent value="margem" className="space-y-0">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Margem Global */}
               <Card>
                 <CardContent className="pt-6 space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                     <Euro className="h-5 w-5 text-primary" />
                     <h3 className="text-lg font-semibold text-foreground">Margem de Lucro Global</h3>
                   </div>
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <Label className="text-base">Margem aplicada</Label>
                       <span className="text-2xl font-bold text-primary tabular-nums">{activeMargemLucro}%</span>
                     </div>
                     <Slider
                       min={0}
                       max={50}
                       step={1}
                       value={[activeMargemLucro]}
                       onValueChange={(value) => setLocalMargemLucro(value[0])}
                       disabled={isReadOnly}
                       className="py-2"
                     />
                     <div className="flex justify-between text-xs text-muted-foreground">
                       <span>0%</span>
                       <span>25%</span>
                       <span>50%</span>
                     </div>
                     {localMargemLucro !== null && localMargemLucro !== orcamento.margem_lucro && (
                       <Button
                          onClick={async () => {
                            const savedValue = localMargemLucro;
                            await updateOrcamento.mutateAsync({ id: orcamento.id, margem_lucro: localMargemLucro });
                            // Keep local value until query refetch updates orcamento.margem_lucro
                            setLocalMargemLucro(savedValue);
                          }}
                         disabled={updateOrcamento.isPending}
                         className="w-full"
                       >
                         {updateOrcamento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Guardar Margem ({localMargemLucro}%)
                       </Button>
                     )}
                   </div>
                   <div className="space-y-4 pt-4 border-t border-border">
                     <Label className="text-sm font-medium">Custos Indiretos</Label>
                     <div className="grid grid-cols-3 gap-4">
                       <div>
                         <Label className="text-xs text-muted-foreground">Estaleiro (€)</Label>
                         <Input
                           type="number"
                           value={orcamento.custos_indiretos?.estaleiro || 0}
                           disabled={isReadOnly}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value) || 0;
                             updateOrcamento.mutateAsync({
                               id: orcamento.id,
                               custos_indiretos: { ...orcamento.custos_indiretos, estaleiro: val } as any,
                             });
                           }}
                         />
                       </div>
                       <div>
                         <Label className="text-xs text-muted-foreground">Seguros (€)</Label>
                         <Input
                           type="number"
                           value={orcamento.custos_indiretos?.seguros || 0}
                           disabled={isReadOnly}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value) || 0;
                             updateOrcamento.mutateAsync({
                               id: orcamento.id,
                               custos_indiretos: { ...orcamento.custos_indiretos, seguros: val } as any,
                             });
                           }}
                         />
                       </div>
                       <div>
                         <Label className="text-xs text-muted-foreground">Licenciamento (€)</Label>
                         <Input
                           type="number"
                           value={orcamento.custos_indiretos?.licenciamento || 0}
                           disabled={isReadOnly}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value) || 0;
                             updateOrcamento.mutateAsync({
                               id: orcamento.id,
                               custos_indiretos: { ...orcamento.custos_indiretos, licenciamento: val } as any,
                             });
                           }}
                         />
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               {/* IVA / Fiscal Context */}
               <Card>
                 <CardContent className="pt-6 space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                     <Scale className="h-5 w-5 text-primary" />
                     <h3 className="text-lg font-semibold text-foreground">Contexto Fiscal & IVA</h3>
                   </div>
                   
                   {/* Quick IVA regime buttons */}
                   <div>
                     <Label className="text-xs text-muted-foreground mb-2 block">Seleção rápida de regime</Label>
                     <div className="grid grid-cols-2 gap-2">
                       {[
                         { value: 23, label: 'IVA Normal', desc: '23% - Regime geral' },
                         { value: 6, label: 'IVA Reduzido', desc: '6% - Reabilitação/habitação' },
                         { value: 0, label: 'Autoliquidação', desc: '0% - Subempreitada (art. 2º)' },
                         { value: 13, label: 'IVA Intermédio', desc: '13% - Taxa intermédia' },
                       ].map((regime) => {
                          const currentTaxa = manualTaxa ?? fiscalPreview?.taxa_iva ?? contextoFiscal?.taxa_iva ?? 23;
                          const isActive = currentTaxa === regime.value;
                          return (
                            <button
                              key={regime.value}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => {
                                // Set manual tax and clear fiscal selectors
                                setManualTaxa(regime.value);
                                setTipoObra(undefined);
                                setTipoCliente(undefined);
                                setTipoOperacao(undefined);
                              }}
                             className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                               isActive
                                 ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                 : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                             } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                             <span className="block text-sm font-semibold text-foreground">{regime.label}</span>
                             <span className="block text-xs text-muted-foreground">{regime.desc}</span>
                           </button>
                         );
                       })}
                     </div>
                   </div>

                   {/* Current IVA highlight */}
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Taxa de IVA aplicada</p>
                        <p className="text-sm font-medium text-foreground">
                          {manualTaxa !== null
                            ? [{ v: 23, n: 'IVA Normal' }, { v: 6, n: 'IVA Reduzido' }, { v: 0, n: 'Autoliquidação' }, { v: 13, n: 'IVA Intermédio' }].find(r => r.v === manualTaxa)?.n || 'Manual'
                            : fiscalPreview ? fiscalPreview.regime_nome : contextoFiscal?.regime?.nome || 'IVA Normal'}
                        </p>
                      </div>
                      <span className="text-3xl font-black text-primary tabular-nums">
                        {manualTaxa ?? fiscalPreview?.taxa_iva ?? contextoFiscal?.taxa_iva ?? 23}%
                      </span>
                    </div>

                   {fiscalPreview?.nota_legal && (
                     <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
                       <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                       <p className="text-xs text-muted-foreground leading-relaxed">
                         {fiscalPreview.nota_legal}
                       </p>
                     </div>
                   )}

                   <div className="space-y-3">
                     <div>
                       <Label className="text-xs text-muted-foreground">Tipo de Obra</Label>
                       <Select
                         value={tipoObra || '_none_'}
                           onValueChange={(v) => {
                             setTipoObra(v === '_none_' ? undefined : v as TipoObraFiscal);
                           }}
                         disabled={isReadOnly}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecionar tipo de obra..." />
                         </SelectTrigger>
                         <SelectContent className="bg-popover">
                           <SelectItem value="_none_">Não especificado</SelectItem>
                           {Object.entries(TIPO_OBRA_FISCAL_CONFIG).map(([key, config]) => (
                             <SelectItem key={key} value={key}>{config.label}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">Tipo de Cliente</Label>
                       <Select
                         value={tipoCliente || '_none_'}
                           onValueChange={(v) => {
                             setTipoCliente(v === '_none_' ? undefined : v as TipoClienteFiscal);
                           }}
                         disabled={isReadOnly}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecionar tipo de cliente..." />
                         </SelectTrigger>
                         <SelectContent className="bg-popover">
                           <SelectItem value="_none_">Não especificado</SelectItem>
                           {Object.entries(TIPO_CLIENTE_FISCAL_CONFIG).map(([key, config]) => (
                             <SelectItem key={key} value={key}>{config.label}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">Tipo de Operação</Label>
                       <Select
                         value={tipoOperacao || '_none_'}
                           onValueChange={(v) => {
                             setTipoOperacao(v === '_none_' ? undefined : v as TipoOperacaoFiscal);
                           }}
                         disabled={isReadOnly}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecionar tipo de operação..." />
                         </SelectTrigger>
                         <SelectContent className="bg-popover">
                           <SelectItem value="_none_">Não especificado</SelectItem>
                           {Object.entries(TIPO_OPERACAO_FISCAL_CONFIG).map(([key, config]) => (
                             <SelectItem key={key} value={key}>{config.label}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>

                   {!isReadOnly && (
                     <Button
                       variant="outline"
                       className="w-full"
                       onClick={handleSaveFiscalContext}
                       disabled={saveContextoFiscal.isPending}
                     >
                       {saveContextoFiscal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                       Aplicar Contexto Fiscal
                     </Button>
                   )}
                 </CardContent>
               </Card>
             </div>
           </TabsContent>

           {/* Tab: Configuração Comercial */}
           <TabsContent value="comercial" className="space-y-0">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <Card>
                 <CardContent className="pt-6 space-y-5">
                   <div className="flex items-center gap-2 mb-2">
                     <FileText className="h-5 w-5 text-primary" />
                     <h3 className="text-lg font-semibold text-foreground">Textos Comerciais</h3>
                   </div>
                   <div>
                     <Label className="text-xs text-muted-foreground">Introdução comercial</Label>
                     <Textarea
                       placeholder="Ex: Temos o prazer de apresentar a nossa proposta para os trabalhos de..."
                       defaultValue={orcamento.commercial_intro_text || ''}
                       rows={4}
                       disabled={isReadOnly}
                       className="resize-none mt-1"
                       onBlur={(e) => updateOrcamento.mutateAsync({ id: orcamento.id, commercial_intro_text: e.target.value || null } as any)}
                     />
                   </div>
                   <div>
                     <Label className="text-xs text-muted-foreground">Condições de pagamento</Label>
                     <Textarea
                       placeholder="Ex: 30% na adjudicação, 40% a meio da obra, 30% na conclusão"
                       defaultValue={orcamento.commercial_payment_terms_text || ''}
                       rows={3}
                       disabled={isReadOnly}
                       className="resize-none mt-1"
                       onBlur={(e) => updateOrcamento.mutateAsync({ id: orcamento.id, commercial_payment_terms_text: e.target.value || null } as any)}
                     />
                   </div>
                   <div>
                     <Label className="text-xs text-muted-foreground">Validade da proposta</Label>
                     <Input
                       placeholder="Ex: Esta proposta é válida por 30 dias"
                       defaultValue={orcamento.commercial_validity_text || ''}
                       disabled={isReadOnly}
                       className="mt-1"
                       onBlur={(e) => updateOrcamento.mutateAsync({ id: orcamento.id, commercial_validity_text: e.target.value || null } as any)}
                     />
                   </div>
                   <div>
                     <Label className="text-xs text-muted-foreground">Notas / Observações</Label>
                     <Textarea
                       placeholder="Notas adicionais para o documento comercial..."
                       defaultValue={orcamento.commercial_notes_text || ''}
                       rows={3}
                       disabled={isReadOnly}
                       className="resize-none mt-1"
                       onBlur={(e) => updateOrcamento.mutateAsync({ id: orcamento.id, commercial_notes_text: e.target.value || null } as any)}
                     />
                   </div>
                   <div>
                     <Label className="text-xs text-muted-foreground">Observações do rodapé (PDF técnico)</Label>
                     <Textarea
                       placeholder={"Uma observação por linha. Deixe em branco para usar o texto padrão definido em Perfil → Empresa."}
                       defaultValue={(orcamento as any).observations_text || ''}
                       rows={4}
                       disabled={isReadOnly}
                       className="resize-none mt-1"
                       onBlur={(e) => updateOrcamento.mutateAsync({ id: orcamento.id, observations_text: e.target.value || null } as any)}
                     />
                     <p className="text-[11px] text-muted-foreground mt-1">
                       Substitui as observações padrão apenas neste orçamento.
                     </p>
                   </div>
                 </CardContent>
               </Card>
               <Card>
                 <CardContent className="pt-6 space-y-5">
                   <div className="flex items-center gap-2 mb-2">
                     <Info className="h-5 w-5 text-primary" />
                     <h3 className="text-lg font-semibold text-foreground">Opções do Documento</h3>
                   </div>
                   <div className="flex items-center justify-between rounded-lg border p-3">
                     <div>
                       <p className="text-sm font-medium">Bloco de Assinatura</p>
                       <p className="text-xs text-muted-foreground">Incluir espaço para assinatura do cliente e empresa</p>
                     </div>
                     <input
                       type="checkbox"
                       className="h-4 w-4 accent-primary"
                       defaultChecked={orcamento.show_signature_block || false}
                       disabled={isReadOnly}
                       onChange={(e) => updateOrcamento.mutateAsync({ id: orcamento.id, show_signature_block: e.target.checked } as any)}
                     />
                   </div>
                   <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                     <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                     <p>Configure os textos comerciais e preencha o "Resumo Cliente" em cada capítulo na aba Artigos.</p>
                     <p className="mt-1">Ao gerar PDF, escolha o formato <strong>Comercial Resumido</strong>.</p>
                   </div>
                 </CardContent>
               </Card>
             </div>
           </TabsContent>

           {/* Tab: Medições Paramétricas */}
           <TabsContent value="medicoes" className="space-y-0">
             <ParametricMeasurements 
               orcamentoId={orcamento.id} 
               isReadOnly={isReadOnly}
             />
           </TabsContent>
         </Tabs>
      </div>

      {/* Capítulo Modal */}
      <Dialog open={showCapituloModal} onOpenChange={setShowCapituloModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCapitulo ? 'Editar Capítulo' : 'Novo Capítulo'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do capítulo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Número</Label>
                <Input
                  type="number"
                  min={1}
                  value={capituloForm.numero}
                  onChange={(e) =>
                    setCapituloForm({ ...capituloForm, numero: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="col-span-3">
                <Label>Título</Label>
                <Input
                  value={capituloForm.titulo}
                  onChange={(e) => setCapituloForm({ ...capituloForm, titulo: e.target.value })}
                  placeholder="Ex: Alvenarias"
                />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={capituloForm.descricao}
                onChange={(e) => setCapituloForm({ ...capituloForm, descricao: e.target.value })}
                placeholder="Descrição do capítulo..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCapituloModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCapitulo}
                disabled={createCapitulo.isPending || updateCapitulo.isPending}
              >
                {(createCapitulo.isPending || updateCapitulo.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingCapitulo ? 'Guardar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Artigo Modal */}
      <Dialog open={showArtigoModal} onOpenChange={setShowArtigoModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingArtigo ? 'Editar Artigo' : 'Novo Artigo'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do artigo de trabalho
            </DialogDescription>
          </DialogHeader>
          <ArtigoForm
            defaultValues={getArtigoDefaults()}
            onSubmit={handleSaveArtigo}
            onCancel={() => setShowArtigoModal(false)}
            isLoading={createArtigo.isPending || updateArtigo.isPending}
            submitLabel={editingArtigo ? 'Guardar' : 'Adicionar'}
            orcamentoId={orcamento.id}
          />
        </DialogContent>
      </Dialog>

      {/* Catálogo Modal */}
      <CatalogoModal
        open={showCatalogoModal}
        onClose={() => setShowCatalogoModal(false)}
        onAddArtigos={handleAddFromCatalog}
      />

      <AlertDialog open={!!deleteCapituloId} onOpenChange={() => setDeleteCapituloId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Capítulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza? Todos os artigos deste capítulo serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCapitulo}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Artigo Dialog */}
      <AlertDialog open={!!deleteArtigoId} onOpenChange={() => setDeleteArtigoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Artigo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este artigo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArtigo}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjudicar Wizard */}
      {ADJUDICAVEL_STATUSES.includes(orcamento.status as any) && (
        <AdjudicacaoWizard
          open={showAdjudicarModal}
          onOpenChange={setShowAdjudicarModal}
          orcamento={orcamento as any}
          valorFinal={orcamento.valor_total || 0}
        />
      )}

      {/* Finalizar Modal - Seleção de Cliente */}
      <Dialog open={showFinalizarModal} onOpenChange={setShowFinalizarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Finalizar Orçamento
            </DialogTitle>
            <DialogDescription>
              Confirme ou selecione o cliente antes de enviar o orçamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <Select value={finalizarClienteId} onValueChange={setFinalizarClienteId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {clientesAtivos && clientesAtivos.length > 0 ? (
                    clientesAtivos.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {cliente.nome}
                          {cliente.empresa && (
                            <span className="text-muted-foreground text-xs">({cliente.empresa})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Client validation feedback */}
            {finalizarClienteId && (() => {
              const cliente = clientesAtivos?.find(c => c.id === finalizarClienteId);
              if (!cliente) return null;
              const missing: string[] = [];
              if (!cliente.email) missing.push('email');
              if (!cliente.telefone && !cliente.telemovel) missing.push('telefone');
              if (!cliente.endereco) missing.push('morada');
              if (missing.length > 0) {
                return (
                  <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md p-3">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Dados em falta: {missing.join(', ')}</p>
                      <a href={`/clientes/${cliente.id}/editar`} className="underline text-xs">
                        Editar cliente
                      </a>
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  Cliente com dados completos
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFinalizarModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={updateStatus.isPending || updateOrcamento.isPending || !finalizarClienteId}
            >
              {(updateStatus.isPending || updateOrcamento.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Enviar ao Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}
