import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, ExternalLink, FileText, Building2, FileCheck2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  obraId?: string | null;
  orcamentoId?: string | null;
}

interface LineageRow {
  id: string;
  orcamento_id: string;
  obra_id: string | null;
  commercial_proposal_id: string | null;
  budget_version_id: string | null;
  base_budget_id: string | null;
  closing_sheet_id: string | null;
  adjudicated_at: string | null;
  metadata: any;
  orcamento?: { id: string; codigo: string | null; titulo: string | null } | null;
  obra?: { id: string; nome: string | null } | null;
  commercial_proposal?: { id: string; version: number; status: string } | null;
}

export function RastreabilidadePanel({ obraId, orcamentoId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['budget-lineage', { obraId, orcamentoId }],
    enabled: Boolean(obraId || orcamentoId),
    queryFn: async () => {
      let q = supabase
        .from('budget_lineage')
        .select(`
          *,
          orcamento:orcamentos!budget_lineage_orcamento_id_fkey ( id, codigo, titulo ),
          obra:obras ( id, nome ),
          commercial_proposal:commercial_proposals ( id, version, status )
        `)
        .order('created_at', { ascending: false });
      if (obraId) q = q.eq('obra_id', obraId);
      if (orcamentoId) q = q.eq('orcamento_id', orcamentoId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LineageRow[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4 text-primary" />
          Rastreabilidade
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Liga proposta comercial → orçamento → obra → folha de fecho para cada adjudicação.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há registos de rastreabilidade. Adjudica um orçamento para começar a cadeia.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((row) => (
              <li key={row.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div className="text-xs text-muted-foreground">
                    {row.adjudicated_at
                      ? `Adjudicado a ${format(new Date(row.adjudicated_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}`
                      : 'Sem data de adjudicação'}
                  </div>
                  {row.metadata?.valor_adjudicado != null && (
                    <Badge variant="outline">
                      {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
                        .format(Number(row.metadata.valor_adjudicado))}
                    </Badge>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                  <LinkChip
                    icon={FileText}
                    label="Proposta"
                    value={row.commercial_proposal ? `v${row.commercial_proposal.version}` : '—'}
                  />
                  <LinkChip
                    icon={FileText}
                    label="Orçamento"
                    value={row.orcamento?.codigo ?? row.orcamento?.titulo ?? '—'}
                    href={row.orcamento_id ? `/orcamentos/${row.orcamento_id}` : undefined}
                  />
                  <LinkChip
                    icon={Building2}
                    label="Obra"
                    value={row.obra?.nome ?? '—'}
                    href={row.obra_id ? `/obras/${row.obra_id}` : undefined}
                  />
                  <LinkChip
                    icon={FileCheck2}
                    label="Folha de fecho"
                    value={row.closing_sheet_id ? 'Disponível' : '—'}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LinkChip({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
      {href && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
    </div>
  );
  if (href) {
    return <Link to={href}>{inner}</Link>;
  }
  return inner;
}
