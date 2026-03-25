import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
 import { useFiscalEngine } from '@/hooks/useFiscalEngine';

export default function EditarOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [valorAdjudicado, setValorAdjudicado] = useState<string>('');
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
    return (
      <AppLayout title="Carregar Orçamento...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isReadOnly = orcamento.status === 'adjudicado';

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

  const handleFinalizar = async () => {
    await updateStatus.mutateAsync({
      id: orcamento.id,
      status: 'enviado',
      data_envio: new Date().toISOString(),
    });
    toast({ title: 'Sucesso', description: 'Orçamento enviado ao cliente' });
  };

  const handleAdjudicar = async () => {
    const valor = parseFloat(valorAdjudicado);
    if (isNaN(valor) || valor <= 0) {
      toast({ title: 'Erro', description: 'Introduza um valor adjudicado válido', variant: 'destructive' });
      return;
    }
    await updateStatus.mutateAsync({
      id: orcamento.id,
      status: 'adjudicado',
      valor_adjudicado: valor,
    });
    setShowAdjudicarModal(false);
  };

  const getArtigoDefaults = (): Partial<ArtigoFormData> | undefined => {
    if (editingArtigo) {
      const cap = orcamento.capitulos?.find((c) => c.id === editingArtigo.capituloId);
      const art = cap?.artigos?.find((a) => a.id === editingArtigo.id);
      if (art) {
        return {
          codigo: art.codigo || '',
          descricao: art.descricao,
          unidade: art.unidade,
          quantidade: art.quantidade,
          preco_unitario: art.preco_unitario,
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
        <Button onClick={handleFinalizar}>
          <Send className="mr-2 h-4 w-4" />
          Finalizar
        </Button>
      )}
      {(orcamento.status === 'enviado' || orcamento.status === 'aprovado') && (
        <Button
          onClick={() => {
            setValorAdjudicado(String(orcamento.valor_total || ''));
            setShowAdjudicarModal(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Adjudicar
        </Button>
      )}
    </>
  );

  return (
    <AppLayout
      title={orcamento.titulo}
      subtitle={orcamento.obra ? `Obra: ${orcamento.obra.nome}` : undefined}
      actions={headerActions}
    >
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

        {/* Tabs */}
         <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
           <TabsList className="grid w-full max-w-lg grid-cols-3">
             <TabsTrigger value="artigos" className="flex items-center gap-2">
               <FileStack className="h-4 w-4" />
               Artigos
             </TabsTrigger>
             <TabsTrigger value="margem" className="flex items-center gap-2">
               <Euro className="h-4 w-4" />
               Margem & IVA
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
                         { value: 23, label: 'IVA Normal', desc: '23% — Regime geral' },
                         { value: 6, label: 'IVA Reduzido', desc: '6% — Reabilitação/habitação' },
                         { value: 0, label: 'Autoliquidação', desc: '0% — Subempreitada (art. 2º)' },
                         { value: 13, label: 'IVA Intermédio', desc: '13% — Taxa intermédia' },
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

      {/* Adjudicar Modal */}
      <Dialog open={showAdjudicarModal} onOpenChange={setShowAdjudicarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Adjudicar Orçamento
            </DialogTitle>
            <DialogDescription>
              Confirme o valor adjudicado pelo cliente. Será criada uma obra automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="valor-adjudicado">Valor Adjudicado (€)</Label>
              <div className="relative mt-1.5">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valor-adjudicado"
                  type="number"
                  min={0}
                  step={0.01}
                  value={valorAdjudicado}
                  onChange={(e) => setValorAdjudicado(e.target.value)}
                  className="pl-9 text-lg font-semibold"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor total do orçamento: {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(orcamento.valor_total || 0)}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdjudicarModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdjudicar}
              disabled={updateStatus.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Adjudicação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
