import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Step1Data, TipoObra } from '@/components/orcamentos/essencial/EssencialStep1Cliente';
import type { TrabalhoItem } from '@/components/orcamentos/essencial/EssencialStep2Trabalhos';

const STORAGE_KEY = 'orcamento_essencial_draft';

interface DraftState {
  step1: Step1Data;
  items: TrabalhoItem[];
  margemLucro: number;
  orcamentoId?: string;
  clienteId?: string;
  capituloId?: string;
  startTime: number;
}

const defaultStep1: Step1Data = {
  nome_cliente: '',
  email: '',
  telefone: '',
  tipo_obra: '' as TipoObra,
};

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDraft(state: DraftState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useOrcamentoEssencial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const draft = loadDraft();

  const [step1, setStep1] = useState<Step1Data>(draft?.step1 || defaultStep1);
  const [items, setItems] = useState<TrabalhoItem[]>(draft?.items || []);
  const [margemLucro, setMargemLucro] = useState(draft?.margemLucro ?? 20);
  const [orcamentoId, setOrcamentoId] = useState<string | undefined>(draft?.orcamentoId);
  const [clienteId, setClienteId] = useState<string | undefined>(draft?.clienteId);
  const [capituloId, setCapituloId] = useState<string | undefined>(draft?.capituloId);
  const [startTime] = useState(draft?.startTime || Date.now());
  const [isLoading, setIsLoading] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Autosave
  useEffect(() => {
    saveDraft({ step1, items, margemLucro, orcamentoId, clienteId, capituloId, startTime });
  }, [step1, items, margemLucro, orcamentoId, clienteId, capituloId, startTime]);

  // Track event — now uses axia_events table
  const trackEvent = useCallback(async (eventType: string, extra?: Record<string, any>) => {
    if (!user) return;
    try {
      await supabase.from('axia_events' as any).insert({
        user_id: user.id,
        event_name: eventType,
        entity_type: 'orcamento',
        entity_id: orcamentoId || null,
        metadata: {
          tempo_total_segundos: Math.round((Date.now() - startTime) / 1000),
          quantidade_itens: items.length,
          tipo_obra: step1.tipo_obra,
          ...extra,
        },
      });
    } catch { /* silent */ }
    // Keep old table as fallback
    try {
      await supabase.from('essencial_events').insert({
        user_id: user.id,
        event_type: eventType,
        orcamento_id: orcamentoId || null,
        tempo_total_segundos: Math.round((Date.now() - startTime) / 1000),
        quantidade_itens: items.length,
        modelo_utilizado: false,
        metadata: extra || {},
      } as any);
    } catch { /* silent */ }
  }, [user, orcamentoId, startTime, items.length, step1.tipo_obra]);

  // Load templates for tipo_obra
  const loadTemplates = useCallback(async (tipoObra: string) => {
    setIsLoadingTemplates(true);
    try {
      const { data } = await supabase
        .from('orcamento_templates_essencial')
        .select('*')
        .eq('tipo_obra', tipoObra) as any;
      setTemplates(data || []);
    } catch { setTemplates([]); }
    setIsLoadingTemplates(false);
  }, []);

  // Step 1 complete: find/create client + create orcamento
  const completeStep1 = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Find or create client
      let cId = clienteId;
      if (!cId) {
        const { data: existing } = await supabase
          .from('clientes')
          .select('id')
          .eq('email', step1.email)
          .maybeSingle();

        if (existing) {
          cId = existing.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clientes')
            .insert({
              user_id: user.id,
              nome: step1.nome_cliente,
              email: step1.email,
              telefone: step1.telefone,
            })
            .select('id')
            .single();
          if (clientError) throw clientError;
          cId = newClient.id;
        }
        setClienteId(cId);
      }

      // Create orcamento if not already created
      if (!orcamentoId) {
        const tipoLabel = step1.tipo_obra.replace(/_/g, ' ');
        const titulo = `Orçamento ${tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1)} - ${step1.nome_cliente}`;

        // Generate budget code
        const { data: codigo } = await supabase
          .rpc('generate_orcamento_codigo', { p_user_id: user.id });

        const { data: orc, error: orcError } = await supabase
          .from('orcamentos')
          .insert({
            user_id: user.id,
            titulo,
            codigo: codigo || null,
            cliente_id: cId,
            status: 'rascunho',
            margem_lucro: margemLucro,
            valor_total: 0,
            custos_indiretos: { estaleiro: 0, seguros: 0, licenciamento: 0 },
          })
          .select('id')
          .single();
        if (orcError) throw orcError;
        setOrcamentoId(orc.id);

        // Create single chapter
        const { data: cap, error: capError } = await supabase
          .from('capitulos_orcamento')
          .insert({
            orcamento_id: orc.id,
            numero: 1,
            titulo: 'Trabalhos',
            ordem: 1,
          })
          .select('id')
          .single();
        if (capError) throw capError;
        setCapituloId(cap.id);
      }

      await loadTemplates(step1.tipo_obra);
      await trackEvent('essencial_step1_completed');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  }, [user, step1, clienteId, orcamentoId, margemLucro, loadTemplates, trackEvent, toast]);

  // Step 2 complete: save items to artigos_orcamento
  const completeStep2 = useCallback(async () => {
    if (!capituloId) return;
    setIsLoading(true);
    try {
      // Delete existing items for this chapter
      await supabase
        .from('artigos_orcamento')
        .delete()
        .eq('capitulo_id', capituloId);

      // Insert new items
      const artigos = items.map((item, idx) => ({
        capitulo_id: capituloId,
        descricao: item.descricao,
        unidade: 'vg',
        quantidade: 1,
        preco_unitario: item.valor,
        preco_base: item.valor,
        margem_lucro_artigo: 0,
        ordem: idx + 1,
      }));

      if (artigos.length > 0) {
        const { error } = await supabase
          .from('artigos_orcamento')
          .insert(artigos);
        if (error) throw error;
      }

      await trackEvent('essencial_step2_completed');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  }, [capituloId, items, trackEvent, toast]);

  // Finalize
  const finalize = useCallback(async (incluirIva: boolean) => {
    if (!orcamentoId || !capituloId) return;
    setIsLoading(true);
    try {
      // Re-save artigos as safety measure
      await supabase
        .from('artigos_orcamento')
        .delete()
        .eq('capitulo_id', capituloId);

      const artigos = items.map((item, idx) => ({
        capitulo_id: capituloId,
        descricao: item.descricao,
        unidade: 'vg',
        quantidade: 1,
        preco_unitario: item.valor,
        preco_base: item.valor,
        margem_lucro_artigo: 0,
        ordem: idx + 1,
      }));

      if (artigos.length > 0) {
        const { error: artError } = await supabase
          .from('artigos_orcamento')
          .insert(artigos);
        if (artError) throw artError;
      }

      // Update orcamento
      const subtotal = items.reduce((s, i) => s + i.valor, 0);

      await supabase
        .from('orcamentos')
        .update({
          status: 'enviado',
          margem_lucro: margemLucro,
          valor_total: subtotal,
          data_envio: new Date().toISOString(),
        })
        .eq('id', orcamentoId);

      await trackEvent('essencial_completed', {
        incluir_iva: incluirIva,
        valor_total: subtotal,
        margem_lucro: margemLucro,
      });

      clearDraft();
      toast({ title: 'Orçamento criado com sucesso!' });
      navigate(`/orcamentos/${orcamentoId}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  }, [orcamentoId, capituloId, items, margemLucro, trackEvent, toast, navigate]);

  // Start tracking
  useEffect(() => {
    if (user && !draft) {
      trackEvent('essencial_started');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    step1, setStep1,
    items, setItems,
    margemLucro, setMargemLucro,
    templates, isLoadingTemplates,
    isLoading,
    completeStep1,
    completeStep2,
    finalize,
  };
}
