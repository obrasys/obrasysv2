import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { BudgetTypeSelector } from '@/components/orcamentos/essencial-v2/BudgetTypeSelector';
import { AreasGrid } from '@/components/orcamentos/essencial-v2/AreasGrid';
import { ItemSelectorModal } from '@/components/orcamentos/essencial-v2/ItemSelectorModal';
import { SelectedItemsPreview } from '@/components/orcamentos/essencial-v2/SelectedItemsPreview';
import { BudgetSummaryTable } from '@/components/orcamentos/essencial-v2/BudgetSummaryTable';
import { TotalsAdjustments } from '@/components/orcamentos/essencial-v2/TotalsAdjustments';
import { ClientIdentification } from '@/components/orcamentos/essencial-v2/ClientIdentification';
import {
  type BudgetType,
  type BudgetItem,
  type AreaConfig,
  type BudgetClientInfo,
  getAreasForType,
  computeItemTotals,
  formatEUR,
} from '@/types/orcamento-essencial';
import { calcPrecoVenda } from '@/lib/margin';
import { generateOrcamentoPdf } from '@/lib/orcamento-pdf';
import { generateComercialPdf } from '@/lib/orcamento-pdf-comercial';
import type { Orcamento, Capitulo, ArtigoOrcamento } from '@/types/orcamentos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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

const DRAFT_KEY = 'essencial_v2_draft';

interface DraftState {
  budgetType: BudgetType | null;
  items: BudgetItem[];
  customAreas: AreaConfig[];
  clientInfo: BudgetClientInfo;
  contingencyPercent: number;
  discountPercent: number;
  vatPercent: number;
  marginPercent: number;
}

function getDefaultClientInfo(): BudgetClientInfo {
  const today = new Date();
  const valid = new Date(today);
  valid.setDate(valid.getDate() + 30);
  const start = new Date(today);
  start.setMonth(start.getMonth() + 3);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  return {
    budgetNumber: '',
    clientName: '',
    workLocation: '',
    conditions: '',
    date: fmt(today),
    validUntil: fmt(valid),
    expectedStart: fmt(start),
  };
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDraft(state: DraftState) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
}

export default function EssencialPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const draft = useRef(loadDraft()).current;

  const [budgetType, setBudgetType] = useState<BudgetType | null>(draft?.budgetType ?? null);
  const [items, setItems] = useState<BudgetItem[]>(draft?.items ?? []);
  const [customAreas, setCustomAreas] = useState<AreaConfig[]>(draft?.customAreas ?? []);
  const [clientInfo, setClientInfo] = useState<BudgetClientInfo>(draft?.clientInfo ?? getDefaultClientInfo());
  const [contingencyPercent, setContingencyPercent] = useState(draft?.contingencyPercent ?? 0);
  const [discountPercent, setDiscountPercent] = useState(draft?.discountPercent ?? 0);
  const [vatPercent, setVatPercent] = useState(draft?.vatPercent ?? 23);
  const [marginPercent, setMarginPercent] = useState(draft?.marginPercent ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Modal state
  const [modalArea, setModalArea] = useState<AreaConfig | null>(null);

  // Autosave
  useEffect(() => {
    const state: DraftState = { budgetType, items, customAreas, clientInfo, contingencyPercent, discountPercent, vatPercent, marginPercent };
    saveDraft(state);
  }, [budgetType, items, customAreas, clientInfo, contingencyPercent, discountPercent, vatPercent, marginPercent]);

  // Computed
  const systemAreas = budgetType ? getAreasForType(budgetType) : [];
  const allAreas = [...systemAreas, ...customAreas];

  const itemCounts: Record<string, number> = {};
  items.forEach((i) => { itemCounts[i.areaKey] = (itemCounts[i.areaKey] || 0) + 1; });

  const subtotalBase = items.reduce((sum, item) => sum + computeItemTotals(item).subtotal, 0);

  // Handlers
  const handleTypeChange = (type: BudgetType) => {
    setBudgetType(type);
  };

  const handleAddItems = useCallback((newItems: BudgetItem[]) => {
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, []);

  const handleUpdateItem = useCallback((id: string, updates: Partial<BudgetItem>) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleClear = () => {
    setShowClearDialog(true);
  };

  const confirmClear = () => {
    setItems([]);
    setCustomAreas([]);
    setBudgetType(null);
    setContingencyPercent(0);
    setDiscountPercent(0);
    setVatPercent(23);
    setMarginPercent(0);
    setClientInfo(getDefaultClientInfo());
    localStorage.removeItem(DRAFT_KEY);
    setShowClearDialog(false);
    toast({ title: 'Orçamento limpo com sucesso.' });
  };

  const handleAddCustomArea = useCallback((area: AreaConfig) => {
    setCustomAreas((prev) => [...prev, area]);
  }, []);

  const handleRemoveCustomArea = useCallback((key: string) => {
    setCustomAreas((prev) => prev.filter((a) => a.key !== key));
    setItems((prev) => prev.filter((i) => i.areaKey !== key));
  }, []);

  const handleEditCustomArea = useCallback((key: string, newLabel: string) => {
    setCustomAreas((prev) => prev.map((a) => a.key === key ? { ...a, label: newLabel } : a));
  }, []);

  // Save & generate PDF
  const handleSave = async (format: 'tecnico' | 'comercial' = 'tecnico') => {
    if (!user) {
      toast({ title: 'Erro', description: 'Precisa estar autenticado.', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Atenção', description: 'Adicione pelo menos um item ao orçamento.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Find or create client
      let clienteId: string | null = null;
      if (clientInfo.clientName.trim()) {
        const { data: existing } = await supabase
          .from('clientes')
          .select('id')
          .eq('nome', clientInfo.clientName.trim())
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          clienteId = existing.id;
        } else {
          const { data: newClient } = await supabase
            .from('clientes')
            .insert({ user_id: user.id, nome: clientInfo.clientName.trim() })
            .select('id')
            .single();
          clienteId = newClient?.id || null;
        }
      }

      // Generate code
      const { data: codigo } = await supabase.rpc('generate_orcamento_codigo', { p_user_id: user.id });

      const tipoLabel = budgetType === 'remodelacao' ? 'Remodelação'
        : budgetType === 'construcao_nova' ? 'Construção Nova'
        : budgetType === 'icf' ? 'ICF' : 'LSF';

      const titulo = `Orçamento ${tipoLabel} - ${clientInfo.clientName || 'Sem cliente'}`;

      // Apply margin to subtotal (real margin on sale price)
      const subtotalWithMargin = marginPercent > 0 ? calcPrecoVenda(subtotalBase, marginPercent) : subtotalBase;
      const contingencyValue = subtotalWithMargin * (contingencyPercent / 100);
      const afterContingency = subtotalWithMargin + contingencyValue;
      const discountValue = afterContingency * (discountPercent / 100);
      const subtotalBeforeVat = afterContingency - discountValue;
      const vatValue = subtotalBeforeVat * (vatPercent / 100);
      const totalFinal = subtotalBeforeVat + vatValue;

      // Create orcamento
      const { data: orc, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          titulo,
          codigo: codigo || clientInfo.budgetNumber || null,
          cliente_id: clienteId,
          status: 'enviado',
          margem_lucro: marginPercent,
          valor_total: totalFinal,
          custos_indiretos: { estaleiro: 0, seguros: 0, licenciamento: 0 },
          data_envio: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (orcError) throw orcError;

      // Group items by area, create chapters
      const grouped: Record<string, BudgetItem[]> = {};
      items.forEach((item) => {
        (grouped[item.areaKey] ||= []).push(item);
      });

      let capOrder = 1;
      for (const [areaKey, areaItems] of Object.entries(grouped)) {
        const areaLabel = allAreas.find((a) => a.key === areaKey)?.label || areaKey;

        const { data: cap, error: capError } = await supabase
          .from('capitulos_orcamento')
          .insert({
            orcamento_id: orc.id,
            numero: capOrder,
            titulo: areaLabel,
            ordem: capOrder,
          })
          .select('id')
          .single();

        if (capError) throw capError;

        const artigos = areaItems.map((item, idx) => {
          const unitCost = item.laborUnitPrice + item.materialTotalPrice;
          const unitSalePrice = marginPercent > 0 ? calcPrecoVenda(unitCost, marginPercent) : unitCost;
          return {
            capitulo_id: cap.id,
            descricao: item.name,
            unidade: item.unit,
            quantidade: item.quantity,
            preco_unitario: unitSalePrice,
            preco_base: unitCost,
            margem_lucro_artigo: marginPercent,
            ordem: idx + 1,
          };
        });

        if (artigos.length > 0) {
          const { error } = await supabase.from('artigos_orcamento').insert(artigos);
          if (error) throw error;
        }

        capOrder++;
      }

      // Track event
      try {
        await supabase.from('axia_events' as any).insert({
          user_id: user.id,
          event_name: 'essencial_v2_completed',
          entity_type: 'orcamento',
          entity_id: orc.id,
          metadata: {
            budget_type: budgetType,
            item_count: items.length,
            total_final: totalFinal,
            margin_percent: marginPercent,
          },
        });
      } catch { /* silent */ }

      localStorage.removeItem(DRAFT_KEY);
      toast({ title: 'Orçamento criado com sucesso!' });
      // Navigate to the budget view page — format can be used later for PDF generation
      navigate(`/orcamentos/${orc.id}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <AppLayout
      title="Orçamento Essencial"
      subtitle="Cria um orçamento profissional de forma rápida e intuitiva"
    >
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 text-xs font-medium text-muted-foreground">
          <span className={budgetType ? 'text-primary' : ''}>① Tipo</span>
          <span className="text-border">→</span>
          <span className={items.length > 0 ? 'text-primary' : ''}>② Itens</span>
          <span className="text-border">→</span>
          <span>③ Margem & IVA</span>
          <span className="text-border">→</span>
          <span>④ Finalizar</span>
        </div>

        <div className="space-y-8">
          {/* A - Budget Type */}
          <BudgetTypeSelector value={budgetType} onChange={handleTypeChange} />

          {/* B - Areas */}
          {budgetType && (
            <AreasGrid
              areas={systemAreas}
              customAreas={customAreas}
              onAddCustomArea={handleAddCustomArea}
              onRemoveCustomArea={handleRemoveCustomArea}
              onEditCustomArea={handleEditCustomArea}
              onAreaClick={(area) => setModalArea(area)}
              itemCounts={itemCounts}
            />
          )}

          {/* C - Selected Items Preview */}
          {budgetType && items.length > 0 && (
            <SelectedItemsPreview
              items={items}
              allAreas={allAreas}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
            />
          )}

          {/* D - Summary Table */}
          {budgetType && items.length > 0 && (
            <BudgetSummaryTable
              items={items}
              allAreas={allAreas}
              marginPercent={marginPercent}
              onClear={handleClear}
            />
          )}

          {/* E - Totals & Adjustments (with margin) */}
          {budgetType && items.length > 0 && (
            <TotalsAdjustments
              subtotalBase={subtotalBase}
              marginPercent={marginPercent}
              contingencyPercent={contingencyPercent}
              discountPercent={discountPercent}
              vatPercent={vatPercent}
              onMarginChange={setMarginPercent}
              onContingencyChange={setContingencyPercent}
              onDiscountChange={setDiscountPercent}
              onVatChange={setVatPercent}
            />
          )}

          {/* F - Client Identification */}
          {budgetType && items.length > 0 && (
            <ClientIdentification
              data={clientInfo}
              onChange={setClientInfo}
              onSave={handleSave}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Item Selector Modal */}
      {modalArea && (
        <ItemSelectorModal
          open={!!modalArea}
          onClose={() => setModalArea(null)}
          areaKey={modalArea.key}
          areaLabel={modalArea.label}
          onAddItems={handleAddItems}
        />
      )}

      {/* Clear confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens, áreas e dados serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
