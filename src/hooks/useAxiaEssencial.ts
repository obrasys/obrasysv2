import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TrabalhoItem } from '@/components/orcamentos/essencial/EssencialStep2Trabalhos';

export interface AxiaSuggestion {
  id: string;
  type: 'add_item' | 'value_outlier' | 'adjust_profit' | 'template_choice';
  message: string;
  payload: any;
  accepted?: boolean;
}

export function useAxiaEssencial(orcamentoId?: string) {
  const { user, session } = useAuth();
  const [suggestions, setSuggestions] = useState<AxiaSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetch = useRef<number>(0);

  const trackAxiaEvent = useCallback(async (eventName: string, entityId?: string, metadata?: Record<string, any>) => {
    if (!user) return;
    try {
      await supabase.from('axia_events' as any).insert({
        user_id: user.id,
        event_name: eventName,
        entity_type: 'orcamento',
        entity_id: entityId || orcamentoId || null,
        metadata: metadata || {},
      });
    } catch { /* silent */ }
  }, [user, orcamentoId]);

  const fetchSuggestions = useCallback(async (
    step: number,
    tipoObra: string,
    items: TrabalhoItem[],
    margemLucro?: number,
  ) => {
    if (!session?.access_token || !user) return;
    
    // Debounce: 2 seconds minimum between fetches
    const now = Date.now();
    if (now - lastFetch.current < 2000) return;
    lastFetch.current = now;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('axia-suggestions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { tipo_obra: tipoObra, items, step, margemLucro },
      });

      if (!error && data?.suggestions) {
        setSuggestions(
          data.suggestions.map((s: any, idx: number) => ({
            ...s,
            id: `axia-${step}-${idx}-${Date.now()}`,
          }))
        );
      }
    } catch (e) {
      console.error('Axia suggestions error:', e);
    }
    setLoading(false);
  }, [session?.access_token, user]);

  const acceptSuggestion = useCallback(async (suggestion: AxiaSuggestion) => {
    if (!user) return;
    setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, accepted: true } : s));
    
    try {
      await supabase.from('axia_suggestions_log' as any).insert({
        user_id: user.id,
        orcamento_id: orcamentoId || null,
        suggestion_type: suggestion.type,
        suggestion_payload: suggestion.payload,
        accepted: true,
      });
    } catch { /* silent */ }

    await trackAxiaEvent('axia_suggestion_accepted', orcamentoId, { 
      type: suggestion.type, 
      payload: suggestion.payload 
    });
  }, [user, orcamentoId, trackAxiaEvent]);

  const dismissSuggestion = useCallback(async (suggestion: AxiaSuggestion) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    if (!user) return;
    try {
      await supabase.from('axia_suggestions_log' as any).insert({
        user_id: user.id,
        orcamento_id: orcamentoId || null,
        suggestion_type: suggestion.type,
        suggestion_payload: suggestion.payload,
        accepted: false,
      });
    } catch { /* silent */ }

    await trackAxiaEvent('axia_suggestion_dismissed', orcamentoId, { type: suggestion.type });
  }, [user, orcamentoId, trackAxiaEvent]);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return {
    suggestions,
    loading,
    fetchSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    clearSuggestions,
    trackAxiaEvent,
  };
}
