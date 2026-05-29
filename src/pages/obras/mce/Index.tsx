import { useNavigate, useParams } from 'react-router-dom';
import { Plus, FileSpreadsheet, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMCEList, useCreateMCE, useDeleteMCE } from '@/hooks/useMCE';
import { MCE_STATUS_LABELS, MCE_CATEGORY_LABELS } from '@/types/mce';

export default function MCEIndex() {
  const { id: obraId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: list = [], isLoading } = useMCEList(obraId);
  const createMce = useCreateMCE();
  const removeMce = useDeleteMCE();

  const handleCreate = async () => {
    if (!obraId) return;
    const newId = await createMce.mutateAsync({ obra_id: obraId });
    navigate(`/obras/${obraId}/mce/${newId}`);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

  return (
    <AppLayout
      title="Mapas Comparativos Económicos (MCE)"
      subtitle="Comparação de fornecedores por rubrica — modelo Mod. 03-1"
      actions={
        <Button onClick={handleCreate} disabled={createMce.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Novo MCE
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4">


      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sem MCEs nesta obra. Crie o primeiro mapa comparativo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((m) => (
            <Card
              key={m.id}
              className="hover:shadow-md transition-shadow cursor-pointer rounded-xl"
              onClick={() => navigate(`/obras/${obraId}/mce/${m.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      MCE Nº {m.mce_number ?? '—'} · {m.title}
                    </CardTitle>
                    {m.contractual_reference && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.contractual_reference}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{MCE_STATUS_LABELS[m.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {m.category && (
                  <p className="text-xs text-muted-foreground">
                    {MCE_CATEGORY_LABELS[m.category]}
                  </p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Orçamento Seco</span>
                  <span className="font-medium">{fmt(m.dry_budget_total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Adjudicado</span>
                  <span className="font-medium">{fmt(m.awarded_value)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t">
                  <span className="text-muted-foreground">Verba (Ganho/Perda)</span>
                  <span
                    className={`font-semibold ${
                      m.gain_loss_value >= 0 ? 'text-emerald-600' : 'text-destructive'
                    }`}
                  >
                    {fmt(m.gain_loss_value)}
                  </span>
                </div>
                {m.status === 'rascunho' && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Eliminar este MCE?')) {
                          removeMce.mutate({ id: m.id, obra_id: obraId! });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
