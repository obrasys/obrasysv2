import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { PageHeader, MetricCardGrid, MetricCard, EmptyState } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCadernos } from "@/hooks/useCadernos";
import { useObra } from "@/hooks/useObras";
import { CadernoStatusBadge } from "@/components/cadernos";
import { CADERNO_ORIGEM_CONFIG } from "@/types/cadernos";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CadernosPage() {
  const { id: obraId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { obra, isLoading: loadingObra } = useObra(obraId);
  const { cadernos, isLoading: loadingCadernos, refetch } = useCadernos(obraId);
  const { deleteCaderno } = useCadernos(obraId) as any;

  const isLoading = loadingObra || loadingCadernos;

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCaderno?.mutateAsync(deleteId);
    setDeleteId(null);
    refetch();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (isLoading) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!obra) {
    return (
      <AppLayout title="Obra não encontrada">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">A obra solicitada não foi encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/obras")}>
            Voltar às Obras
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Cadernos de Encargos"
      subtitle={obra.nome}
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Orçamentação"
          title="Cadernos de Encargos"
          subtitle={obra.nome}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(`/obras/${obraId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar à Obra
              </Button>
              <Button onClick={() => navigate(`/obras/${obraId}/cadernos/importar`)}>
                <Plus className="w-4 h-4 mr-2" />
                Importar Caderno
              </Button>
            </div>
          }
        />

        {cadernos && cadernos.length > 0 ? (
          <>
            <MetricCardGrid columns={4}>
              <MetricCard label="Total" value={cadernos.length} icon={FileText} />
              <MetricCard
                label="Importados"
                value={cadernos.filter((c) => c.status === "importado").length}
                icon={Upload}
              />
              <MetricCard
                label="Validados"
                value={cadernos.filter((c) => c.status === "validado").length}
                icon={FileText}
                tone="success"
              />
              <MetricCard
                label="Orçamentados"
                value={cadernos.filter((c) => c.status === "orcamentado").length}
                icon={ExternalLink}
                tone="primary"
              />
            </MetricCardGrid>
          </>
        ) : null}
        {cadernos && cadernos.length > 0 ? (
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cadernos.map((caderno) => (
              <Card key={caderno.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {caderno.nome}
                    </CardTitle>
                    <CadernoStatusBadge status={caderno.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{caderno.ficheiro_nome || "Sem ficheiro"}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Origem:</span>
                    <span>{CADERNO_ORIGEM_CONFIG[caderno.origem].label}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Itens:</span>
                    <span>{caderno.itens_validados} / {caderno.total_itens} validados</span>
                  </div>

                  {caderno.valor_estimado > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor estimado:</span>
                      <span className="font-medium">{formatCurrency(caderno.valor_estimado)}</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Criado em {format(new Date(caderno.created_at), "dd/MM/yyyy", { locale: pt })}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    {caderno.status === "importado" && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/obras/${obraId}/cadernos/${caderno.id}/importar`)}
                      >
                        Analisar
                      </Button>
                    )}
                    {caderno.status === "analisado" && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/obras/${obraId}/cadernos/${caderno.id}/validar`)}
                      >
                        Validar
                      </Button>
                    )}
                    {caderno.status === "validado" && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/obras/${obraId}/cadernos/${caderno.id}/resumo`)}
                      >
                        Ver Resumo
                      </Button>
                    )}
                    {caderno.status === "orcamentado" && caderno.orcamento_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/orcamentos/${caderno.orcamento_id}/editar`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Orçamento
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(caderno.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Upload}
            title="Nenhum caderno importado"
            description="Importe um caderno de encargos para começar a criar orçamentos de forma rápida e precisa."
            action={
              <Button onClick={() => navigate(`/obras/${obraId}/cadernos/importar`)}>
                <Plus className="w-4 h-4 mr-2" />
                Importar Primeiro Caderno
              </Button>
            }
          />
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Caderno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O caderno e todos os seus itens serão eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
