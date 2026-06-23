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
  tipo_base: TipoBase;
  margem_configuravel_pct?: number;
  origem?: 'global' | 'csv' | 'manual';
  fonte_base?: string | null;
}

/**
 * Upsert de um artigo na Base de Preços do utilizador (base_artigos_user).
 * Faz o link automaticamente à organização atual.
 *
 * Notas:
 * - onConflict: organization_id,tipo_base,codigo (mesma chave usada nos imports CSV).
 * - Recalcula custo_direto_eur e preco_indicativo_eur com base na margem.
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
        const custo = Number((mo + mat).toFixed(2));
        const margem = Number(input.margem_configuravel_pct ?? 25);
        const preco =
          margem >= 100 ? custo : Number((custo / (1 - margem / 100)).toFixed(2));

        const codigo =
          input.codigo?.trim() ||
          `MAN-${Date.now().toString(36).toUpperCase()}`;

        const payload = {
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
          custo_direto_eur: custo,
          margem_configuravel_pct: margem,
          preco_indicativo_eur: preco,
          fonte_base: input.fonte_base ?? 'Orçamento Essencial',
          estado: 'Confirmado',
        };

        const { error } = await supabase
          .from('base_artigos_user' as any)
          .upsert(payload, { onConflict: 'organization_id,tipo_base,codigo' });
        if (error) throw error;

        qc.invalidateQueries({ queryKey: ['base_artigos_user'] });
        qc.invalidateQueries({ queryKey: ['base_artigos_area_v2'] });
        return { ok: true, codigo };
      } catch (e: any) {
        // Falha silenciosa não bloqueia o orçamento, mas avisa.
        toast.error(`Não foi possível gravar na Base: ${e.message ?? e}`);
        return { ok: false };
      }
    },
    [qc]
  );
}
