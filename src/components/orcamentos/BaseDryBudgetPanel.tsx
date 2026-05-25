import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock, Unlock, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useBudgetVersions,
  useApproveBaseDryBudget,
  type BudgetVersion,
} from "@/hooks/useBudgetVersions";

interface Props {
  orcamentoId: string;
  isLocked: boolean;
  lockedAt: string | null;
  status: string;
  valorBase: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

export function BaseDryBudgetPanel({ orcamentoId, isLocked, lockedAt, status, valorBase }: Props) {
  const { data: versions = [], isLoading } = useBudgetVersions(orcamentoId);
  const approve = useApproveBaseDryBudget();

  const baseVersion: BudgetVersion | undefined = versions.find((v) => v.version_type === "base_dry");
  const canApprove = !isLocked && !baseVersion && status !== "rascunho_inicial";

  return (
    <div className="space-y-4">
      {/* Banner explicativo */}
      <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="py-4 flex items-start gap-3">
          {isLocked ? (
            <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Unlock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold mb-1">Orçamento Base Seco</p>
            <p className="text-muted-foreground leading-relaxed">
              Representa a fase estimativa antes do início da obra. Quando aprovado, é
              <strong> bloqueado para edição</strong> e gera automaticamente a{" "}
              <strong>Folha de Fecho Inicial</strong> e a primeira versão do{" "}
              <strong>Budget Objetivo</strong>. A partir daí, o controlo ativo passa a ser feito
              pela camada operacional.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Estado atual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Estado do Orçamento Base
            </span>
            {isLocked ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200">
                <Lock className="h-3 w-3 mr-1" /> Fechado Inicial / Bloqueado
              </Badge>
            ) : (
              <Badge variant="outline">Editável</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Valor base (custo)</p>
              <p className="font-semibold">{formatCurrency(valorBase)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado orçamento</p>
              <p className="font-semibold capitalize">{status.replace(/_/g, " ")}</p>
            </div>
            {baseVersion && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Versão Base</p>
                  <p className="font-semibold">v{baseVersion.version_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bloqueado em</p>
                  <p className="font-semibold">
                    {baseVersion.locked_at
                      ? format(new Date(baseVersion.locked_at), "dd/MM/yyyy", { locale: pt })
                      : "—"}
                  </p>
                </div>
              </>
            )}
            {!baseVersion && lockedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Bloqueado em</p>
                <p className="font-semibold">
                  {format(new Date(lockedAt), "dd/MM/yyyy", { locale: pt })}
                </p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {isLocked
                  ? "Edições diretas estão bloqueadas. Use o Budget Objetivo para gerir alterações."
                  : "Quando aprovar, este orçamento será bloqueado e o Budget Objetivo v1 será criado."}
              </p>

              {canApprove && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={approve.isPending}>
                      {approve.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Aprovar e gerar Folha de Fecho Inicial
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Aprovar Orçamento Base Seco?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação é <strong>irreversível</strong>. O orçamento será bloqueado para
                        edição, será gerada a <strong>Folha de Fecho Inicial</strong> e a primeira
                        versão do <strong>Budget Objetivo</strong>. Todo o controlo ativo passará a
                        ser feito por essa camada operacional.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => approve.mutate(orcamentoId)}>
                        Aprovar e bloquear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
