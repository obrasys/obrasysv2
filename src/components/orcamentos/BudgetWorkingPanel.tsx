import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileLock2,
  GitCompare,
  History,
  Loader2,
  Plus,
  Star,
  TargetIcon,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  isVersionActive,
  useApproveBudgetVersion,
  useArchiveBudgetVersion,
  useBudgetWorkingVersions,
  useCreateBudgetWorkingVersion,
  useSetActiveBudgetVersion,
  versionStatusLabel,
  type BudgetWorkingVersion,
} from "@/hooks/useBudgetWorkingVersions";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { NewBudgetVersionDialog } from "./NewBudgetVersionDialog";
import { BudgetCompareDialog } from "./BudgetCompareDialog";

interface Props {
  /** Id do orçamento base (locked) */
  baseOrcamentoId: string;
}

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

export function BudgetWorkingPanel({ baseOrcamentoId }: Props) {
  const navigate = useNavigate();
  const [editorOpen, setEditorOpen] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [compareForId, setCompareForId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const { orcamento: base } = useOrcamento(baseOrcamentoId);
  const { data: versions = [], isLoading } = useBudgetWorkingVersions(baseOrcamentoId);
  const createVersion = useCreateBudgetWorkingVersion();
  const approve = useApproveBudgetVersion();
  const setActive = useSetActiveBudgetVersion();
  const archive = useArchiveBudgetVersion();

  const activeVersion = useMemo(() => versions.find(isVersionActive), [versions]);
  const currentVersion =
    versions.find((v) => v.id === selectedVersionId) ?? activeVersion ?? versions[0];

  const baseTotal = Number(base?.valor_total ?? 0);
  const isBaseLocked = Boolean((base as any)?.is_base_locked);

  // Auto-cria V1 quando ainda não existe nenhuma versão
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (!isLoading && base?.id && versions.length === 0 && !createVersion.isPending && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      createVersion.mutate({ baseId: baseOrcamentoId });
    }
  }, [isLoading, base?.id, versions.length, baseOrcamentoId, createVersion]);

  if (isLoading || versions.length === 0 || !currentVersion) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">A preparar Budget a partir do Orçamento Base…</p>
      </div>
    );
  }

  const versionLabel = `V${currentVersion.budget_version_number}${
    currentVersion.version_name ? ` · ${currentVersion.version_name}` : ""
  }`;
  const statusInfo = versionStatusLabel(currentVersion.budget_version_status);
  const isReadOnly = !isVersionActive(currentVersion);

  return (
    <div className="space-y-4">
      {/* ===== Orçamento Base Bloqueado ===== */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <FileLock2 className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold flex items-center gap-2">
                Orçamento Base
                {isBaseLocked && (
                  <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px]">Bloqueado</Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {isBaseLocked
                  ? "Bloqueado pela Folha de Fecho Base · só para consulta"
                  : "Será bloqueado quando a Folha de Fecho Base for gravada"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Total Base</p>
              <p className="text-base font-semibold">{fmtEUR(baseTotal)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/orcamentos/${baseOrcamentoId}`)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver Base
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* ===== Coluna principal ===== */}
        <div className="space-y-4">
          {/* Header da versão selecionada + ações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <TargetIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">Budget {versionLabel}</span>
                  <Badge className={`text-[10px] ${statusInfo.tone}`}>{statusInfo.label}</Badge>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCompareForId(currentVersion.id)}>
                    <GitCompare className="h-3.5 w-3.5 mr-1.5" /> Comparar c/ Base
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewDialog(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova versão
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditorOpen((v) => !v)}>
                    {editorOpen ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                    {editorOpen ? "Recolher editor" : "Editar artigos"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <KPI label="Total Base" value={fmtEUR(baseTotal)} />
                <KPI
                  label={`Total ${versionLabel.split(" ")[0]}`}
                  value={fmtEUR(currentVersion.valor_total)}
                  highlight
                />
                <KPI
                  label="Desvio vs Base"
                  value={fmtEUR(currentVersion.valor_total - baseTotal)}
                  tone={
                    currentVersion.valor_total > baseTotal
                      ? "negative"
                      : currentVersion.valor_total < baseTotal
                      ? "positive"
                      : undefined
                  }
                />
                <KPI
                  label="Atualizado"
                  value={format(new Date(currentVersion.updated_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                />
              </div>
              {currentVersion.version_reason && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Motivo:</span> {currentVersion.version_reason}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {currentVersion.budget_version_status !== "aprovado" && !isReadOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approve.mutate({ versionId: currentVersion.id, baseId: baseOrcamentoId })}
                    disabled={approve.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Aprovar versão
                  </Button>
                )}
                {!isVersionActive(currentVersion) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActive.mutate({ versionId: currentVersion.id, baseId: baseOrcamentoId })}
                    disabled={setActive.isPending}
                  >
                    <Star className="h-3.5 w-3.5 mr-1.5" /> Definir como ativa
                  </Button>
                )}
                {!isVersionActive(currentVersion) &&
                  currentVersion.budget_version_status !== "arquivada" &&
                  currentVersion.budget_version_status !== "locked" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => archive.mutate({ versionId: currentVersion.id, baseId: baseOrcamentoId })}
                      disabled={archive.isPending}
                    >
                      <Archive className="h-3.5 w-3.5 mr-1.5" /> Arquivar
                    </Button>
                  )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    createVersion.mutate({ baseId: baseOrcamentoId, cloneFrom: currentVersion.id })
                  }
                  disabled={createVersion.isPending}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicar esta versão
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Editor inline (mesma tela) */}
          {editorOpen && (
            <Card className="overflow-hidden">
              {isReadOnly && (
                <div className="bg-muted/50 border-b px-4 py-2 text-xs text-muted-foreground">
                  Esta versão está em modo só-leitura ({statusInfo.label.toLowerCase()}). Para editar,
                  define-a como ativa ou duplica-a numa nova versão.
                </div>
              )}
              <iframe
                key={currentVersion.id}
                src={`/orcamentos/${currentVersion.id}/editar?embed=1`}
                title={`Editor Budget ${versionLabel}`}
                className="w-full border-0 bg-background"
                style={{ height: "calc(100vh - 340px)", minHeight: 560 }}
              />
            </Card>
          )}
        </div>

        {/* ===== Sidebar: histórico ===== */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Versões do Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {versions.map((v) => (
                <VersionRow
                  key={v.id}
                  v={v}
                  selected={v.id === currentVersion.id}
                  onSelect={() => setSelectedVersionId(v.id)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <NewBudgetVersionDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        versions={versions}
        defaultSourceId={currentVersion.id}
        loading={createVersion.isPending}
        onConfirm={async ({ name, sourceId, reason, notes }) => {
          await createVersion.mutateAsync({
            baseId: baseOrcamentoId,
            cloneFrom: sourceId,
            name,
            reason,
            notes,
          });
          setShowNewDialog(false);
        }}
      />

      {compareForId && (
        <BudgetCompareDialog
          open={!!compareForId}
          onOpenChange={(o) => !o && setCompareForId(null)}
          baseId={baseOrcamentoId}
          versionId={compareForId}
          versionLabel={`V${currentVersion.budget_version_number}`}
        />
      )}
    </div>
  );
}

function VersionRow({
  v,
  selected,
  onSelect,
}: {
  v: BudgetWorkingVersion;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = versionStatusLabel(v.budget_version_status);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold leading-tight truncate">
          V{v.budget_version_number}
          {v.version_name ? ` · ${v.version_name}` : ""}
        </p>
        <Badge className={`text-[10px] shrink-0 ${status.tone}`}>{status.label}</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">Total: {fmtEUR(v.valor_total)}</p>
    </button>
  );
}

function KPI({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "positive" | "negative";
}) {
  const toneClass = tone === "negative" ? "text-rose-600" : tone === "positive" ? "text-emerald-600" : "";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${highlight ? "text-primary" : ""} ${toneClass}`}>{value}</p>
    </div>
  );
}
