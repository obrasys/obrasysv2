import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateComercialPdf } from '@/lib/orcamento-pdf-comercial';

export type CommercialProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface CommercialProposal {
  id: string;
  organization_id: string;
  orcamento_id: string;
  version: number;
  status: CommercialProposalStatus;
  snapshot: any;
  valid_until: string | null;
  pdf_path: string | null;
  notes: string | null;
  sent_at: string | null;
  sent_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInput {
  orcamento: any;
  profile: any;
  valorBase: number;
  valorIVA: number;
  valorFinal: number;
  taxaIVA: number;
  validUntil?: string | null;
  notes?: string | null;
}

export function useCommercialProposals(orcamentoId: string | undefined) {
  const qc = useQueryClient();
  const key = ['commercial-proposals', orcamentoId];

  const list = useQuery({
    queryKey: key,
    enabled: !!orcamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_proposals')
        .select('*')
        .eq('orcamento_id', orcamentoId!)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommercialProposal[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: CreateInput) => {
      if (!orcamentoId) throw new Error('Orçamento em falta');
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;

      // Resolve organization
      const { data: orgId, error: orgErr } = await supabase.rpc('get_user_org_id', { _user_id: userId });
      if (orgErr || !orgId) throw new Error('Organização não encontrada');

      // Next version
      const { data: existing } = await supabase
        .from('commercial_proposals')
        .select('version')
        .eq('orcamento_id', orcamentoId)
        .order('version', { ascending: false })
        .limit(1);
      const nextVersion = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;

      // Build snapshot (shows quantity + PVP per article, per project decision)
      const snapshot = {
        generated_at: new Date().toISOString(),
        orcamento: {
          id: input.orcamento.id,
          codigo: input.orcamento.codigo,
          titulo: input.orcamento.titulo,
          numero_revisao: input.orcamento.numero_revisao,
        },
        cliente: input.orcamento.cliente ?? null,
        totals: {
          valorBase: input.valorBase,
          valorIVA: input.valorIVA,
          valorFinal: input.valorFinal,
          taxaIVA: input.taxaIVA,
        },
        capitulos: (input.orcamento.capitulos ?? []).map((c: any) => ({
          id: c.id,
          numero: c.numero,
          titulo: c.titulo,
          valor_total: c.valor_total,
          client_summary_title: c.client_summary_title,
          client_summary_text: c.client_summary_text,
          client_exclusions_text: c.client_exclusions_text,
          artigos: (c.artigos ?? []).map((a: any) => ({
            codigo: a.codigo,
            descricao: a.descricao,
            unidade: a.unidade,
            quantidade: a.quantidade,
            preco_unitario: a.preco_unitario,
            valor_total: a.valor_total,
          })),
        })),
        commercial_intro_text: input.orcamento.commercial_intro_text ?? null,
        commercial_payment_terms_text: input.orcamento.commercial_payment_terms_text ?? null,
        commercial_validity_text: input.orcamento.commercial_validity_text ?? null,
        commercial_notes_text: input.orcamento.commercial_notes_text ?? null,
      };

      // Generate PDF
      const pdfBlob = await generateComercialPdf({
        orcamento: input.orcamento,
        profile: input.profile,
        valorBase: input.valorBase,
        valorIVA: input.valorIVA,
        valorFinal: input.valorFinal,
        taxaIVA: input.taxaIVA,
      } as any);

      // Upload
      const safeCode = (input.orcamento.codigo ?? input.orcamento.id).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      const path = `${orgId}/${orcamentoId}/proposta-${safeCode}-v${nextVersion}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('commercial-proposals')
        .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw upErr;

      const { data: row, error: insErr } = await supabase
        .from('commercial_proposals')
        .insert({
          organization_id: orgId,
          orcamento_id: orcamentoId,
          version: nextVersion,
          status: 'draft',
          snapshot,
          valid_until: input.validUntil ?? null,
          pdf_path: path,
          notes: input.notes ?? null,
          created_by: userId,
        })
        .select('*')
        .single();
      if (insErr) throw insErr;

      return row as CommercialProposal;
    },
    onSuccess: () => {
      toast.success('Proposta comercial gerada');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao gerar proposta'),
  });

  const updateStatus = useMutation({
    mutationFn: async (input: { id: string; status: CommercialProposalStatus; sent_to?: string | null }) => {
      const patch: any = { status: input.status };
      if (input.status === 'sent') {
        patch.sent_at = new Date().toISOString();
        if (input.sent_to !== undefined) patch.sent_to = input.sent_to;
      }
      const { error } = await supabase
        .from('commercial_proposals')
        .update(patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e?.message ?? 'Erro a atualizar estado'),
  });

  const remove = useMutation({
    mutationFn: async (item: CommercialProposal) => {
      if (item.pdf_path) {
        await supabase.storage.from('commercial-proposals').remove([item.pdf_path]).catch(() => {});
      }
      const { error } = await supabase.from('commercial_proposals').delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Proposta removida');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro a remover proposta'),
  });

  const download = async (item: CommercialProposal) => {
    if (!item.pdf_path) throw new Error('PDF indisponível');
    const { data, error } = await supabase.storage
      .from('commercial-proposals')
      .createSignedUrl(item.pdf_path, 300);
    if (error || !data?.signedUrl) throw error ?? new Error('Sem URL');
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return {
    proposals: list.data ?? [],
    isLoading: list.isLoading,
    create,
    updateStatus,
    remove,
    download,
  };
}
