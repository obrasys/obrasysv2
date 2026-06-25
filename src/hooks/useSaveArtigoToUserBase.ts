import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TipoBase } from '@/hooks/useBaseArtigos';

export interface UpsertArtigoInput {
  codigo?: string;          // se omitido gera um (MAN-xxxxx)
  capitulo: string;
  artigo: string;           // descrição
  unidade: string;
  mao_obra_estimada_eur: number;
  material_estimado_eur: number;
  /** Componentes opcionais (paridade com o Avançado). */
  subcontract_cost?: number;
  service_cost?: number;
  rental_cost?: number;
  miscellaneous_cost?: number;
  tipo_base: TipoBase;
  margem_configuravel_pct?: number;
  origem?: 'global' | 'csv' | 'manual';
  fonte_base?: string | null;
  /** Contexto/metadados (Fase 5). */
  intervention_context?: 'interior' | 'exterior' | 'geral' | null;
  area_id?: string | null;
  service_type_id?: string | null;
  observacoes?: string | null;
  /** Quando true, incrementa usage_count e atualiza last_used_at. */
  bumpUsage?: boolean;
}

/**
 * Upsert de um artigo na Base de Preços do utilizador (base_artigos_user).
 * Faz o link automaticamente à organização atual.
 */
export function useSaveArtigoToUserBase() {
  const qc = useQueryClient();

  return useCallback(
    async (input: UpsertArtigoInput): Promise<{ ok: boolean; codigo?: string }> => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) return { ok: false };

        const { data: orgId, error: orgErr } = await supabase.rpc(
          'get_user_org_id' as any
        );
        if (orgErr || !orgId) return { ok: false };

        const mo = Number(input.mao_obra_estimada_eur) || 0;
        const mat = Number(input.material_estimado_eur) || 0;
        const sub = Number(input.subcontract_cost) || 0;
        const srv = Number(input.service_cost) || 0;
        const alu = Number(input.rental_cost) || 0;
        const div = Number(input.miscellaneous_cost) || 0;
        const custo = Number((mo + mat + sub + srv + alu + div).toFixed(2));
        const margem = Number(input.margem_configuravel_pct ?? 25);
        const preco =
          margem >= 100 ? custo : Number((custo / (1 - margem / 100)).toFixed(2));

        const codigo =
          input.codigo?.trim() ||
          `MAN-${Date.now().toString(36).toUpperCase()}`;

        // Quando bumpUsage, ler valor atual para incrementar
        let usageInc: { usage_count: number; last_used_at: string } | undefined;
        if (input.bumpUsage) {
          const { data: existing } = await supabase
            .from('base_artigos_user' as any)
            .select('usage_count')
            .eq('organization_id', orgId)
            .eq('tipo_base', input.tipo_base)
            .eq('codigo', codigo)
            .maybeSingle();
          const prev = (existing as any)?.usage_count ?? 0;
          usageInc = { usage_count: prev + 1, last_used_at: new Date().toISOString() };
        }

        const payload: Record<string, any> = {
          organization_id: orgId,
          user_id: user.id,
          origem: input.origem ?? 'manual',
          tipo_base: input.tipo_base,
          codigo,
          capitulo: input.capitulo || 'Sem capítulo',
          artigo: input.artigo,
          unidade: input.unidade || 'un',
          mao_obra_estimada_eur: mo,
          material_estimado_eur: mat,
          subcontract_cost: sub,
          service_cost: srv,
          rental_cost: alu,
          miscellaneous_cost: div,
          custo_direto_eur: custo,
          margem_configuravel_pct: margem,
          preco_indicativo_eur: preco,
          fonte_base: input.fonte_base ?? 'Orçamento Essencial',
          estado: 'Confirmado',
          source: 'essencial',
        };
        if (input.intervention_context !== undefined) payload.intervention_context = input.intervention_context;
        if (input.area_id !== undefined) payload.area_id = input.area_id;
        if (input.service_type_id !== undefined) payload.service_type_id = input.service_type_id;
        if (input.observacoes !== undefined) payload.observacoes = input.observacoes;
        if (usageInc) Object.assign(payload, usageInc);

        const { error } = await supabase
          .from('base_artigos_user' as any)
          .upsert(payload, { onConflict: 'organization_id,tipo_base,codigo' });
        if (error) throw error;

        qc.invalidateQueries({ queryKey: ['base_artigos_user'] });
        qc.invalidateQueries({ queryKey: ['base_artigos_area_v2'] });
        return { ok: true, codigo };
      } catch (e: any) {
        toast.error(`Não foi possível gravar na Base: ${e.message ?? e}`);
        return { ok: false };
      }
    },
    [qc]
  );
}
