import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Target, GitBranch, Loader2, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useBudgetVersions,
  useBudgetVersionItems,
  useCreateNewTargetVersion,
  useUpdateBudgetVersionItem,
  type BudgetVersion,
  type BudgetVersionItem,
} from "@/hooks/useBudgetVersions";
import { useOperationalLayerLabel } from "@/hooks/useOperationalLayerLabel";
import { Input } from "@/components/ui/input";

interface Props {
  orcamentoId: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

const formatPct = (v: number) =>
  `${(v ?? 0).toFixed(2).replace(".", ",")}%`;

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativa", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  superseded: { label: "Substituída", cls: "bg-muted text-muted-foreground" },
  draft: { label: "Rascunho", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  approved: { label: "Aprovada", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  closed: { label: "Fechada", cls: "bg-amber-100 text-amber-900 border-amber-200" },
};

const CONTRACTING_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-slate-100 text-slate-700" },
  in_quotation: { label: "Em cotação", cls: "bg-blue-100 text-blue-800" },
  awarded: { label: "Adjudicado", cls: "bg-emerald-100 text-emerald-800" },
  purchased: { label: "Comprado", cls: "bg-purple-100 text-purple-800" },
  cancelled: { label: "Cancelado", cls: "bg-rose-100 text-rose-800" },
};

export function TargetBudgetPanel({ orcamentoId }: Props) {
  const { label, short } = useOperationalLayerLabel();
  const { data: versions = [], isLoading } = useBudgetVersions(orcamentoId);
  const createNew = useCreateNewTargetVersion();
  const update = useUpdateBudgetVersionItem();

  const targetVersions = useMemo(
    () => versions.filter((v) => v.version_type === "target"),
    [versions],
  );
  const activeVersion = useMemo(
    () => targetVersions.find((v) => v.status === "active"),
    [targetVersions],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const currentVersion: BudgetVersion | undefined =
    targetVersions.find((v) => v.id === selectedId) ?? activeVersion;

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: items = [], isLoading: itemsLoading } = useBudgetVersionItems(currentVersion?.id);

  // Base seco existe?
  const hasBaseDry = versions.some((v) => v.version_type === "base_dry");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasBaseDry || targetVersions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold mb-1">{label} ainda não disponível</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            O {label} é criado automaticamente quando aprovar o{" "}
            <strong>Orçamento Base Seco</strong> a partir do separador "Base".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: selector de versão + nova versão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> {label}
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={currentVersion?.id ?? ""}
                onValueChange={(v) => setSelectedId(v)}
              >
                <SelectTrigger className="h-8 text-xs w-[220px]">
                  <SelectValue placeholder="Selecionar versão" />
                </SelectTrigger>
                <SelectContent>
                  {targetVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version_number}
                      {v.status === "active" ? " · Ativa" : v.status === "superseded" ? " · Substituída" : ""}
                      {v.version_name ? ` · ${v.version_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova versão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar nova versão do {short}</DialogTitle>
                    <DialogDescription>
                      A versão atualmente ativa será marcada como <strong>Substituída</strong> e a
                      nova versão (a partir da ativa) ficará como ativa.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Motivo da nova versão (ex: alteração de pacote, revisão de preços...)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() =>
                        createNew.mutate(
                          { orcamentoId, reason: reason.trim() || undefined },
                          {
                            onSuccess: () => {
                              setNewDialogOpen(false);
                              setReason("");
                              setSelectedId(undefined);
                            },
                          },
                        )
                      }
                      disabled={createNew.isPending}
                    >
                      {createNew.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <GitBranch className="h-4 w-4 mr-2" /> Criar versão
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>

        {currentVersion && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Versão</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-semibold">v{currentVersion.version_number}</p>
                  <Badge
                    variant="outline"
                    className={STATUS_LABEL[currentVersion.status]?.cls ?? ""}
                  >
                    {STATUS_LABEL[currentVersion.status]?.label ?? currentVersion.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base</p>
                <p className="font-semibold">{formatCurrency(currentVersion.total_base)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Objetivo</p>
                <p className="font-semibold">{formatCurrency(currentVersion.total_target)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adjudicado</p>
                <p className="font-semibold">{formatCurrency(currentVersion.total_awarded)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comprado</p>
                <p className="font-semibold">{formatCurrency(currentVersion.total_purchased)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Desvio vs Base</p>
                <p
                  className={`font-semibold ${
                    currentVersion.variance_from_base > 0
                      ? "text-rose-600"
                      : currentVersion.variance_from_base < 0
                      ? "text-emerald-600"
                      : ""
                  }`}
                >
                  {formatCurrency(currentVersion.variance_from_base)}
                </p>
              </div>
            </div>
            {currentVersion.reason && (
              <p className="text-xs text-muted-foreground mt-3 italic">
                Motivo: {currentVersion.reason}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Criada em{" "}
              {format(new Date(currentVersion.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Itens da versão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Itens do {short}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {itemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem itens nesta versão.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Descrição</TableHead>
                    <TableHead>Cap.</TableHead>
                    <TableHead>Un.</TableHead>
                    <TableHead className="text-right">Qt</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Objetivo</TableHead>
                    <TableHead className="text-right">Adjudicado</TableHead>
                    <TableHead className="text-right">Comprado</TableHead>
                    <TableHead className="text-right">Desvio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const cs = CONTRACTING_LABEL[it.contracting_status] ?? {
                      label: it.contracting_status,
                      cls: "bg-muted",
                    };
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="text-sm">
                          <div className="font-medium leading-tight">{it.description}</div>
                          {it.codigo && (
                            <div className="text-[11px] text-muted-foreground">{it.codigo}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.chapter_code ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">{it.unit ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">
                          <InlineNumber
                            value={it.target_quantity}
                            editable={currentVersion?.status === "active"}
                            onCommit={(v) =>
                              update.mutate({
                                itemId: it.id,
                                versionId: currentVersion!.id,
                                orcamentoId,
                                patch: { target_quantity: v },
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(it.base_total)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          <InlineNumber
                            value={it.target_unit_price}
                            editable={currentVersion?.status === "active"}
                            prefix="€"
                            onCommit={(v) =>
                              update.mutate({
                                itemId: it.id,
                                versionId: currentVersion!.id,
                                orcamentoId,
                                patch: { target_unit_price: v },
                              })
                            }
                          />
                          <div className="text-[10px] text-muted-foreground">
                            = {formatCurrency(it.target_total)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(it.awarded_amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(it.purchased_amount)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-xs font-medium ${
                            it.variance_from_base > 0
                              ? "text-rose-600"
                              : it.variance_from_base < 0
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatCurrency(it.variance_from_base)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${cs.cls} text-[10px]`}>
                            {cs.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
