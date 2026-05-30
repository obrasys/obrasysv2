import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Lock, FileText, FileCheck2, Plus, Trash2, Save, Loader2, Printer, Download, ListChecks, ShieldCheck, ChevronDown, ChevronsDownUp, ChevronsUpDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { ClosingSheet } from "@/hooks/useClosingSheets";
import {
  type ClosingSheetDetails,
  type ClosingSalesLine,
  computeClosingTotals,
  mergeDetails,
} from "@/types/closing-sheet";
import { useUpdateClosingSheetDetails } from "@/hooks/useClosingSheetDetails";
import { useApproveClosingSheet } from "@/hooks/useApproveClosingSheet";
import { useQualitySpecsCatalog } from "@/hooks/useQualitySpecsCatalog";
import { ClosingSheetSiteDetailDialog } from "./ClosingSheetSiteDetailDialog";
import { useClosingSheetSiteDetail, type SiteDetailCategory } from "@/hooks/useClosingSheetSiteDetail";
import { useBudgetChapterTotals } from "@/hooks/useBudgetChapterTotals";

// Mapeamento: categoria do Discriminado → key da rubrica em details.site_costs
const SITE_DETAIL_TO_RUBRICA: Record<SiteDetailCategory, string> = {
  technical_staff: "pessoal_tecnico",
  site_supervisors: "encarregados",
  team_leaders: "chefes_equipa",
  utilities: "utilities",
  site_equipment: "equipamentos",
  site_guard: "guarda",
  site_labor: "pessoal_obra",
  other_site_costs: "outro",
};

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.ceil(v ?? 0));
const pct = (v: number | null | undefined) =>
  `${((v ?? 0) * 100).toFixed(2).replace(".", ",")}%`;

// Formata número como "0 000 000,00" (espaço como separador de milhares, vírgula decimal)
const fmtNumber = (v: number | null | undefined) => {
  const n = Number.isFinite(v as number) ? (v as number) : 0;
  const rounded = Math.round(n * 100) / 100;
  const parts = rounded.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${intPart},${parts[1]}`;
};

function NumCell({
  value,
  onChange,
  readOnly,
  align = "right",
  step = "0.01",
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  align?: "left" | "right";
  step?: string;
}) {
  const safe = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string>("");
  const display = focused ? draft : fmtNumber(safe);
  return (
    <Input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      value={display}
      onFocus={() => {
        setDraft(String(safe).replace(".", ","));
        setFocused(true);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const normalized = e.target.value.replace(/\s/g, "").replace(",", ".");
        const parsed = parseFloat(normalized);
        if (!Number.isNaN(parsed)) onChange(parsed);
        else if (e.target.value.trim() === "") onChange(0);
      }}
      onBlur={() => setFocused(false)}
      className={`h-8 ${align === "right" ? "text-right" : ""} ${readOnly ? "bg-muted" : ""}`}
    />
  );
}

function TextCell({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      value={value || ""}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 ${readOnly ? "bg-muted" : ""}`}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/10 border-l-4 border-primary px-3 py-2 rounded-md">
      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{children}</h3>
    </div>
  );
}

function Section({
  id,
  title,
  collapsed,
  onToggle,
  extra,
  total,
  totalLabel,
  children,
}: {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
  total?: number;
  totalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3" data-section-id={id}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 bg-primary/10 border-l-4 border-primary px-3 py-2 rounded-md flex items-center justify-between hover:bg-primary/15 transition-colors text-left"
          aria-expanded={!collapsed}
        >
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{title}</h3>
          <div className="flex items-center gap-3">
            {collapsed && total !== undefined && (
              <span className="text-sm font-bold tabular-nums text-primary bg-primary/10 px-2 py-0.5 rounded">
                {totalLabel ? `${totalLabel}: ` : ""}
                {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(total)}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-primary transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
            />
          </div>
        </button>
        {extra}
      </div>
      {!collapsed && <div className="space-y-3">{children}</div>}
    </div>
  );
}

function SubtotalRow({ label, value, code }: { label: string; value: number; code?: string }) {
  return (
    <div className="flex items-center justify-between bg-muted/60 border rounded-md px-3 py-2 text-sm">
      <span className="font-bold">
        {label} {code && <span className="text-muted-foreground font-normal">{code}</span>}
      </span>
      <span className="font-bold tabular-nums">{fmt(value)}</span>
    </div>
  );
}

function seedFromLegacy(sheet: ClosingSheet): ClosingSheetDetails {
  const base = mergeDetails(sheet.details);
  const detailsEmpty =
    !sheet.details ||
    Object.keys(sheet.details as object).length === 0 ||
    (base.direct_costs.every((l) => !l.value) && base.site_costs.every((l) => !l.value));

  if (!detailsEmpty) return base;

  // Custos directos: já não pré-seedamos rubricas individuais - os 38
  // capítulos são alimentados em runtime via `useBudgetChapterTotals`.
  const dc = base.direct_costs;

  // Seed estaleiro on Pessoal Técnico (rubrica A)
  const sc = [...base.site_costs];
  const idxGo = sc.findIndex((l) => l.key === "pessoal_tecnico");
  if (idxGo >= 0) sc[idxGo] = { ...sc[idxGo], value: Number(sheet.site_costs) || 0 };

  // Seed sales line from sale_price
  const sales =
    Number(sheet.sale_price) > 0
      ? [
          {
            key: "legacy-sale",
            tipologia: "Total proposta (importado)",
            quantidade: 1,
            area_priv: 1,
            preco_m2: Number(sheet.sale_price),
          },
        ]
      : [];

  return {
    ...base,
    direct_costs: dc,
    site_costs: sc,
    admin: { ...base.admin, estrutura_overhead: Number(sheet.structure_costs) || 0 },
    other: { ...base.other, outros_taxas_ramais: Number(sheet.contingency_amount) || 0 },
    indirect: { ...base.indirect, honorarios_tecnicos: Number(sheet.total_indirect_cost) || 0 },
    sales,
  };
}

export function ClosingSheetFullView({ sheet }: { sheet: ClosingSheet }) {
  const isInitial = sheet.closing_type === "initial";
  const isLocked = sheet.status === "locked";
  // Folha de fecho sempre editável - mesmo após bloqueio o utilizador pode ajustar valores.
  const readOnly = false;
  const { profile } = useAuth();

  const sheetCode = `FF-${isInitial ? "INI" : "FIN"}-${sheet.id.slice(0, 8).toUpperCase()}`;

  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);


  const [details, setDetails] = useState<ClosingSheetDetails>(() => seedFromLegacy(sheet));
  const [siteDetailOpen, setSiteDetailOpen] = useState(false);
  const update = useUpdateClosingSheetDetails(sheet.source_budget_id || undefined);
  const approve = useApproveClosingSheet(sheet.source_budget_id || undefined);
  const qualitySpecs = useQualitySpecsCatalog();

  // Estado de recolher/expandir seções
  const SECTION_IDS = [
    "directos","estaleiro","terreno","indiretos","outros","admin","iva",
    "vendas","estatistica","rai","condicionantes","validacao","aprovacao","qualidades",
  ] as const;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const collapseAll = () => setCollapsed(new Set(SECTION_IDS));
  const expandAll = () => setCollapsed(new Set());
  const isCol = (id: string) => collapsed.has(id);

  useEffect(() => {
    setDetails(seedFromLegacy(sheet));
  }, [sheet.id, sheet.details]);

  // Sincronização: subtotais do Discriminado de Estaleiro → rubricas em details.site_costs
  const siteDetail = useClosingSheetSiteDetail(sheet.id);
  const siteDetailLines = siteDetail.list.data;
  useEffect(() => {
    if (!siteDetailLines || siteDetailLines.length === 0) return;
    const subtotals: Record<string, number> = {};
    for (const l of siteDetailLines) {
      const key = SITE_DETAIL_TO_RUBRICA[l.category];
      subtotals[key] = (subtotals[key] || 0) + Number(l.total_amount || 0);
    }
    setDetails((d) => {
      let changed = false;
      const next = d.site_costs.map((line) => {
        if (subtotals[line.key] !== undefined && Math.abs((line.value || 0) - subtotals[line.key]) > 0.001) {
          changed = true;
          return { ...line, value: subtotals[line.key] };
        }
        return line;
      });
      return changed ? { ...d, site_costs: next } : d;
    });
  }, [siteDetailLines]);

  // Sincronização: totais por capítulo do Orçamento → rubricas em details.direct_costs.
  // Os 38 capítulos são alimentados exclusivamente a partir do Orçamento
  // (capitulos_orcamento). O utilizador não pode editar este valor.
  const chapterTotals = useBudgetChapterTotals(sheet.source_budget_id || undefined);
  const chapterTotalsData = chapterTotals.data;
  useEffect(() => {
    if (!chapterTotalsData) return;
    const byKey: Record<string, number> = {};
    for (const c of chapterTotalsData) {
      const key = `cap_${String(c.numero).padStart(2, "0")}`;
      byKey[key] = (byKey[key] || 0) + (Number(c.total) || 0);
    }
    setDetails((d) => {
      let changed = false;
      const next = d.direct_costs.map((line) => {
        const v = byKey[line.key] ?? 0;
        if (Math.abs((line.value || 0) - v) > 0.001) {
          changed = true;
          return { ...line, value: v };
        }
        return line;
      });
      return changed ? { ...d, direct_costs: next } : d;
    });
  }, [chapterTotalsData]);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const html = node.innerHTML;
    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) {
      toast.error("Não foi possível abrir a janela de impressão.");
      return;
    }
    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");
    const title = `Folha de Fecho - ${isInitial ? "Inicial" : "Final"}`;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${styles}
      <style>body{padding:24px;background:#fff;color:#000;} input,textarea{border:0!important;background:transparent!important;padding:0!important;height:auto!important;} button{display:none!important;}</style>
      </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { exportClosingSheetPDF } = await import("@/lib/closing-sheet-pdf");
      await exportClosingSheetPDF({
        sheet,
        details,
        totals,
        sheetCode,
        company: {
          empresa_nome: profile?.empresa_nome,
          empresa_nif: profile?.empresa_nif,
          empresa_morada: profile?.empresa_morada,
          empresa_telefone: profile?.empresa_telefone,
          empresa_email: profile?.empresa_email,
          empresa_logo_url: profile?.empresa_logo_url,
        },
      });
      toast.success("PDF gerado com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };


  const totals = useMemo(() => computeClosingTotals(details), [details]);

  const patch = <K extends keyof ClosingSheetDetails>(key: K, value: ClosingSheetDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: value }));

  const addSalesLine = () => {
    const newLine: ClosingSalesLine = {
      key: crypto.randomUUID(),
      tipologia: "",
      quantidade: 0,
      area_priv: 0,
      preco_m2: 0,
    };
    patch("sales", [...details.sales, newLine]);
  };

  const updateSalesLine = (key: string, partial: Partial<ClosingSalesLine>) =>
    patch(
      "sales",
      details.sales.map((l) => (l.key === key ? { ...l, ...partial } : l)),
    );

  const removeSalesLine = (key: string) =>
    patch("sales", details.sales.filter((l) => l.key !== key));

  const totalQt = details.sales.reduce((s, l) => s + (l.quantidade || 0), 0);
  const totalArea = details.sales.reduce(
    (s, l) => s + (l.quantidade || 0) * (l.area_priv || 0),
    0,
  );
  const rácioMedio = totalQt > 0 ? totalArea / totalQt : 0;

  const handleSave = () => update.mutate({ sheetId: sheet.id, details, totals });

  const handleApprove = () => {
    if (!window.confirm("Aprovar e bloquear esta Folha de Fecho? Após bloqueio só poderá ser alterada via reabertura por Super Admin.")) return;
    // grava primeiro para garantir consistência
    update.mutate(
      { sheetId: sheet.id, details, totals },
      {
        onSuccess: () => approve.mutate({ sheetId: sheet.id, details, totals }),
      },
    );
  };

  return (
    <Card className={isInitial ? "border-amber-200" : "border-blue-200"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            {isInitial ? (
              <FileText className="h-5 w-5 text-amber-600" />
            ) : (
              <FileCheck2 className="h-5 w-5 text-blue-600" />
            )}
            <span>
              FOLHA DE FECHO DO ORÇAMENTO -{" "}
              <span className="text-muted-foreground font-normal">
                {isInitial ? "Versão Proposta Base | V.00" : "Versão Final"}
              </span>
            </span>
          </span>
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200">
                <Lock className="h-3 w-3 mr-1" /> Bloqueada
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {sheet.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={collapseAll} className="gap-2" title="Recolher todas as seções">
              <ChevronsDownUp className="h-4 w-4" /> Recolher
            </Button>
            <Button size="sm" variant="outline" onClick={expandAll} className="gap-2" title="Expandir todas as seções">
              <ChevronsUpDown className="h-4 w-4" /> Expandir
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar em PDF
            </Button>
            {!readOnly && (
              <>
                <Button size="sm" variant="outline" onClick={() => setSiteDetailOpen(true)} className="gap-2">
                  <ListChecks className="h-4 w-4" /> Discriminar Estaleiro
                </Button>
                <Button size="sm" onClick={handleSave} disabled={update.isPending} className="gap-2">
                  {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Gravar
                </Button>
                <Button size="sm" variant="default" onClick={handleApprove} disabled={approve.isPending || update.isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Aprovar e Bloquear
                </Button>
              </>
            )}
            {readOnly && (
              <Button size="sm" variant="outline" onClick={() => setSiteDetailOpen(true)} className="gap-2">
                <ListChecks className="h-4 w-4" /> Ver Discriminação Estaleiro
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent ref={printRef} className="space-y-6">
        {/* CABEÇALHO EMPRESA + CÓDIGO */}
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div className="flex items-start gap-3">
            {profile?.empresa_logo_url ? (
              <img
                src={profile.empresa_logo_url}
                alt="Logo"
                crossOrigin="anonymous"
                className="h-16 w-16 object-contain rounded-md border bg-white"
              />
            ) : (
              <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                SEM LOGO
              </div>
            )}
            <div className="text-xs leading-snug">
              <p className="text-sm font-bold text-foreground">{profile?.empresa_nome || "-"}</p>
              {profile?.empresa_nif && <p className="text-muted-foreground">NIF: {profile.empresa_nif}</p>}
              {profile?.empresa_morada && <p className="text-muted-foreground">{profile.empresa_morada}</p>}
              <p className="text-muted-foreground">
                {[profile?.empresa_telefone, profile?.empresa_email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold uppercase text-primary">{isInitial ? "Folha de Fecho Inicial" : "Folha de Fecho Final"}</p>
            <p className="font-mono text-sm font-semibold mt-1">{sheetCode}</p>
            <p className="text-muted-foreground mt-1">
              Emitido: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })}
            </p>
            {isLocked && sheet.locked_at && (
              <p className="text-muted-foreground">
                Bloqueada: {format(new Date(sheet.locked_at), "dd/MM/yyyy", { locale: pt })}
              </p>
            )}
          </div>
        </div>

        {/* KPI HERO STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { label: "Custo Industrial", value: fmt(totals.custo_industrial), tone: "muted" as const },
            { label: "Custo Total", value: fmt(totals.custo_total), tone: "primary" as const },
            { label: "Vendas", value: fmt(totals.valor_vendas), tone: "muted" as const },
            { label: "RAI €", value: fmt(totals.rai_eur), tone: totals.rai_eur >= 0 ? "good" as const : "bad" as const },
            { label: "RAI %", value: pct(totals.rai_pct), tone: totals.rai_pct >= 0 ? "good" as const : "bad" as const },
          ].map((k) => (
            <div
              key={k.label}
              className={
                "min-w-0 rounded-lg p-2.5 " +
                (k.tone === "primary"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md"
                  : k.tone === "good"
                    ? "bg-emerald-50 border border-emerald-200"
                    : k.tone === "bad"
                      ? "bg-rose-50 border border-rose-200"
                      : "bg-muted/40 border")
              }
            >
              <p className={`text-[9px] uppercase tracking-wide truncate ${k.tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {k.label}
              </p>
              <p
                className={`font-extrabold tabular-nums mt-0.5 truncate text-sm sm:text-[15px] ${k.tone === "good" ? "text-emerald-700" : k.tone === "bad" ? "text-rose-700" : ""}`}
                title={k.value}
              >
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* CABEÇALHO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">

          <div>
            <Label className="text-[11px] uppercase">Nome da Obra</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.nome_obra}
              onChange={(v) => patch("header", { ...details.header, nome_obra: v })}
            />
          </div>

          <div>
            <Label className="text-[11px] uppercase">Nº / Lote Obra</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.numero_lote}
              onChange={(v) => patch("header", { ...details.header, numero_lote: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Designação</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.designacao}
              onChange={(v) => patch("header", { ...details.header, designacao: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Dono de Obra</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.dono_obra}
              onChange={(v) => patch("header", { ...details.header, dono_obra: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Regime Empreitada</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.regime_empreitada}
              onChange={(v) => patch("header", { ...details.header, regime_empreitada: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Tipo de Obra</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.tipo_obra}
              onChange={(v) => patch("header", { ...details.header, tipo_obra: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Localização</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.localizacao}
              onChange={(v) => patch("header", { ...details.header, localizacao: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Prazo (meses)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.header.prazo_meses ?? 0}
              onChange={(v) => patch("header", { ...details.header, prazo_meses: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Nº Frações</Label>
            <NumCell
              readOnly={readOnly}
              value={details.header.num_fraccoes ?? 0}
              onChange={(v) => patch("header", { ...details.header, num_fraccoes: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Projeto Arquitetura</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.proj_arquitectura}
              onChange={(v) => patch("header", { ...details.header, proj_arquitectura: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Projeto Engenharia</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.proj_engenharia}
              onChange={(v) => patch("header", { ...details.header, proj_engenharia: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Responsável Orçamento</Label>
            <TextCell
              readOnly={readOnly}
              value={details.header.responsavel_orcamento}
              onChange={(v) => patch("header", { ...details.header, responsavel_orcamento: v })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Início da Obra</Label>
            <input
              type="date"
              readOnly={readOnly}
              value={details.header.inicio_obra ?? ""}
              onChange={(e) => patch("header", { ...details.header, inicio_obra: e.target.value || null })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase">Fim da Obra</Label>
            <input
              type="date"
              readOnly={readOnly}
              value={details.header.conclusao_obra ?? ""}
              onChange={(e) => patch("header", { ...details.header, conclusao_obra: e.target.value || null })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

        </div>

        <Separator />

        {/* DADOS ESTATÍSTICOS */}
        <Section id="estatistica" title="Dados Estatísticos (Valor m² Área Construída Equivalente)" collapsed={isCol("estatistica")} onToggle={() => toggleSection("estatistica")}>
        {(() => {
          const abpFromSales = details.sales.reduce(
            (s, l) => s + (Number(l.quantidade) || 0) * (Number(l.area_priv) || 0),
            0,
          );
          const abpEffective = details.statistics.area_construcao_override
            ? (details.statistics.area_construcao || 0)
            : abpFromSales;
          return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <Label>Área Bruta Privativa (m²)</Label>
            <NumCell
              readOnly={readOnly}
              value={abpEffective}
              onChange={(v) =>
                patch("statistics", {
                  ...details.statistics,
                  area_construcao: v,
                  area_construcao_override: true,
                })
              }
            />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
              <span>Auto (mapa vendas): {fmt(abpFromSales)} m²</span>
              {details.statistics.area_construcao_override && !readOnly && (
                <button
                  type="button"
                  className="underline text-primary"
                  onClick={() =>
                    patch("statistics", {
                      ...details.statistics,
                      area_construcao: abpFromSales,
                      area_construcao_override: false,
                    })
                  }
                >
                  repor auto
                </button>
              )}
            </p>
          </div>
          <div>
            <Label>Área Caves (m²)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.statistics.area_caves}
              onChange={(v) => patch("statistics", { ...details.statistics, area_caves: v })}
            />
          </div>
          <div>
            <Label>Área Arranjos Exteriores (m²)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.statistics.area_arranjos_ext}
              onChange={(v) =>
                patch("statistics", { ...details.statistics, area_arranjos_ext: v })
              }
            />
          </div>
          <div>
            <Label>Área de Construção (m²) - ABP + Caves</Label>
            <NumCell
              readOnly={readOnly}
              value={
                details.statistics.area_total_construcao ??
                (abpEffective + (details.statistics.area_caves || 0))
              }
              onChange={(v) =>
                patch("statistics", { ...details.statistics, area_total_construcao: v })
              }
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Auto: {fmt(abpEffective + (details.statistics.area_caves || 0))} m² - editável
            </p>
          </div>
        </div>
          );
        })()}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-muted/40 rounded-md p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Custo / m² equivalente</p>
            <p className="text-lg font-bold tabular-nums">{fmt(totals.custo_m2_equivalente)}</p>
          </div>
          <div className={`rounded-md p-3 ${totals.k_venda >= 1.1 ? "bg-green-100 dark:bg-green-900/30" : totals.k_venda < 0.9 ? "bg-red-100 dark:bg-red-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"}`}>
            <p className={`text-[11px] uppercase ${totals.k_venda >= 1.1 ? "text-green-700 dark:text-green-300" : totals.k_venda < 0.9 ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"}`}>K (coef. Venda)</p>
            <p className={`text-lg font-bold tabular-nums ${totals.k_venda >= 1.1 ? "text-green-700 dark:text-green-200" : totals.k_venda < 0.9 ? "text-red-700 dark:text-red-200" : "text-yellow-700 dark:text-yellow-200"}`}>{totals.k_venda.toFixed(3)}</p>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Valor (m²) das Vendas</p>
            <p className="text-lg font-bold tabular-nums">
              {fmt(
                totals.valor_vendas /
                  Math.max(1, details.statistics.area_construcao || 1),
              )}
            </p>
          </div>
        </div>
        </Section>

        <Separator />

        {/* CONDICIONANTES */}
        <Section id="condicionantes" title="Dados Terreno / Condicionantes de Obra" collapsed={isCol("condicionantes")} onToggle={() => toggleSection("condicionantes")}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {(
            [
              ["estudo_geotecnico", "Estudo Geotécnico"],
              ["zona_urbana", "Loc. Zona Urbana"],
              ["acessos", "Existem Acessos"],
              ["energia_electrica", "Energia Eléctrica"],
              ["canalizacao_agua", "Canalização de Água"],
              ["fundacoes_indirectas", "Fundações Indirectas"],
              ["rebaixamento_freatico", "Rebaixamento Nível Freático"],
              ["condicoes_estaleiro", "Condições p/ Estaleiro"],
              ["ocupacao_via_publica", "Ocupação Via Pública"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 border rounded-md px-3 py-2">
              <Checkbox
                id={key}
                disabled={readOnly}
                checked={(details.conditions as any)[key]}
                onCheckedChange={(c) =>
                  patch("conditions", { ...details.conditions, [key]: !!c })
                }
              />
              <Label htmlFor={key} className="text-xs cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>
        <div>
          <Label className="text-[11px] uppercase">Observações</Label>
          <Textarea
            readOnly={readOnly}
            rows={3}
            value={details.conditions.observacoes}
            onChange={(e) =>
              patch("conditions", { ...details.conditions, observacoes: e.target.value })
            }
          />
        </div>
        </Section>

        <Separator />

        {/* QUALIDADES DA OBRA / CADERNO DE ENCARGOS */}
        <Section
          id="qualidades"
          title="Qualidades da Obra / Caderno de Encargos"
          collapsed={isCol("qualidades")}
          onToggle={() => toggleSection("qualidades")}
          extra={
            <Button size="sm" variant="ghost" asChild className="text-xs gap-1.5">
              <a href="/definicoes/folha-fecho-qualidades" target="_blank" rel="noreferrer">
                <ListChecks className="h-3.5 w-3.5" /> Gerir catálogo
              </a>
            </Button>
          }
        >

        {qualitySpecs.list.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (qualitySpecs.list.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Catálogo vazio. Será populado automaticamente na próxima recarga.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {(qualitySpecs.list.data ?? []).filter((s) => s.ativo).map((spec) => (
              <div key={spec.id}>
                <Label className="text-[11px]">{spec.label}</Label>
                <TextCell
                  readOnly={readOnly}
                  value={details.quality_specs_values[spec.spec_key] || ""}
                  onChange={(v) => patch("quality_specs_values", { ...details.quality_specs_values, [spec.spec_key]: v })}
                  placeholder="Descrição técnica…"
                />
              </div>
            ))}
          </div>
        )}
        </Section>

        <Separator />

        {/* CUSTOS DIRECTOS / PREÇOS SECOS */}
        <Section id="directos" title="Custos Diretos / Preços Secos - Valores s/ IVA" collapsed={isCol("directos")} onToggle={() => toggleSection("directos")} total={totals.total_directos} totalLabel="Total C. Diretos">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] text-left">Rubrica</TableHead>
              <TableHead className="w-[15%] text-center">Valor (€)</TableHead>
              <TableHead className="w-[10%] text-center">% s/ Total</TableHead>
              <TableHead className="w-[20%] text-center">Empresa</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.direct_costs.map((line, idx) => (
              <TableRow key={line.key}>
                <TableCell className="font-medium text-xs">{line.label}</TableCell>
                <TableCell>
                  <NumCell
                    readOnly
                    value={line.value}
                    onChange={() => {}}
                  />
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                  {totals.total_directos > 0
                    ? `${((line.value / totals.total_directos) * 100).toFixed(2)}%`
                    : "-"}
                </TableCell>
                <TableCell>
                  <TextCell
                    readOnly={readOnly}
                    value={line.empresa || ""}
                    onChange={(v) => {
                      const next = [...details.direct_costs];
                      next[idx] = { ...line, empresa: v };
                      patch("direct_costs", next);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextCell
                    readOnly={readOnly}
                    value={line.notas || ""}
                    onChange={(v) => {
                      const next = [...details.direct_costs];
                      next[idx] = { ...line, notas: v };
                      patch("direct_costs", next);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {(details.direct_costs_extra || []).map((line, idx) => {
              const totalDir = totals.total_directos;
              return (
                <TableRow key={line.id} className="bg-primary/5">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TextCell
                        readOnly={readOnly}
                        value={line.label}
                        onChange={(v) => {
                          const next = [...(details.direct_costs_extra || [])];
                          next[idx] = { ...line, label: v };
                          patch("direct_costs_extra", next);
                        }}
                        placeholder="Designação do capítulo avulso…"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <NumCell
                      readOnly={readOnly}
                      value={line.value}
                      onChange={(v) => {
                        const next = [...(details.direct_costs_extra || [])];
                        next[idx] = { ...line, value: Number(v) || 0 };
                        patch("direct_costs_extra", next);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {totalDir > 0 ? `${((line.value / totalDir) * 100).toFixed(2)}%` : "-"}
                  </TableCell>
                  <TableCell>
                    <TextCell
                      readOnly={readOnly}
                      value={line.empresa || ""}
                      onChange={(v) => {
                        const next = [...(details.direct_costs_extra || [])];
                        next[idx] = { ...line, empresa: v };
                        patch("direct_costs_extra", next);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TextCell
                        readOnly={readOnly}
                        value={line.notas || ""}
                        onChange={(v) => {
                          const next = [...(details.direct_costs_extra || [])];
                          next[idx] = { ...line, notas: v };
                          patch("direct_costs_extra", next);
                        }}
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            const next = (details.direct_costs_extra || []).filter((_, i) => i !== idx);
                            patch("direct_costs_extra", next);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!readOnly && (
              <TableRow>
                <TableCell colSpan={5} className="py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const next = [
                        ...(details.direct_costs_extra || []),
                        {
                          id: (typeof crypto !== "undefined" && "randomUUID" in crypto)
                            ? crypto.randomUUID()
                            : `extra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                          label: "",
                          value: 0,
                          empresa: "",
                          notas: "",
                        },
                      ];
                      patch("direct_costs_extra", next);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar capítulo avulso
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <tfoot>
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell className="text-xs">Total (Capítulos do Orçamento)</TableCell>
              <TableCell className="text-right text-xs tabular-nums">
                {(
                  details.direct_costs.reduce((s, l) => s + (l.value || 0), 0) +
                  (details.direct_costs_extra || []).reduce((s, l) => s + (Number(l.value) || 0), 0)
                ).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right text-xs tabular-nums">
                {totals.total_directos > 0 ? "100.00%" : "-"}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </tfoot>
        </Table>
        <p className="text-xs text-muted-foreground italic px-1">
          Os valores por capítulo são calculados automaticamente a partir do Orçamento.
        </p>

        {/* Estimativa editável - colocada ABAIXO do total. Calcula-se por área × preço/m² e soma ao total se houver orçamento. */}
        {(() => {
          const areaConstrucao =
            details.statistics.area_total_construcao ??
            ((details.statistics.area_construcao || 0) + (details.statistics.area_caves || 0));
          const precoM2 = Number(details.direct_costs_estimate_price_m2) || 0;
          const estimativa = precoM2 * areaConstrucao;
          const totalCapitulos = details.direct_costs.reduce((s, l) => s + (l.value || 0), 0);
          return (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-md p-3 space-y-2">
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                ESTIMATIVA (editável - calculada por área × preço/m²)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div className="text-xs">
                  <div className="text-muted-foreground">Área de Construção</div>
                  <div className="font-semibold tabular-nums">
                    {areaConstrucao.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} m²
                  </div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Preço / m² (editável)</div>
                  <NumCell
                    readOnly={readOnly}
                    value={precoM2}
                    onChange={(v) => patch("direct_costs_estimate_price_m2", v)}
                  />
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Estimativa</div>
                  <div className="font-semibold tabular-nums">{fmt(estimativa)}</div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Total Capítulos + Estimativa</div>
                  <div className="font-bold tabular-nums text-primary">{fmt(totalCapitulos + estimativa + (Number(details.direct_costs_estimate) || 0))}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Coloque 0 no preço/m² para remover a estimativa quando os custos reais por capítulo estiverem consolidados.
              </p>
            </div>
          );
        })()}

        <SubtotalRow label="TOTAL CUSTOS DIRECTOS " value={totals.total_directos} />
        {(() => {
          const areaConstrucao =
            details.statistics.area_total_construcao ??
            ((details.statistics.area_construcao || 0) + (details.statistics.area_caves || 0));
          const perM2 = areaConstrucao > 0 ? totals.total_directos / areaConstrucao : 0;
          return (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-xs">
              <span className="font-semibold">
                Custo de Construção / m² <span className="text-muted-foreground font-normal text-[10px]">(sobre {areaConstrucao.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} m² de área de construção)</span>
              </span>
              <span className="font-bold tabular-nums">
                {areaConstrucao > 0 ? `${fmt(perM2)} / m²` : "- (definir área de construção)"}
              </span>
            </div>
          );
        })()}
        </Section>

        {/* ESTALEIRO */}
        <Section id="estaleiro" title="Custos de Estaleiro" collapsed={isCol("estaleiro")} onToggle={() => toggleSection("estaleiro")} total={totals.total_estaleiro} totalLabel="Total C. Estaleiro">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60%] text-left">Rubrica</TableHead>
              <TableHead className="text-right">Valor (€)</TableHead>
              <TableHead className="w-[80px]">Ref.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.site_costs.map((line, idx) => (
              <TableRow key={line.key}>
                <TableCell className="font-medium text-xs">{line.label}</TableCell>
                <TableCell>
                  <NumCell
                    readOnly
                    value={line.value}
                    onChange={() => {}}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  ({String.fromCharCode(65 + idx)})
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground italic px-1">
          Os valores das rubricas de estaleiro são calculados automaticamente a partir do botão &quot;Discriminar Estaleiro&quot;.
        </p>
        <SubtotalRow label="TOTAL ESTALEIRO" value={totals.total_estaleiro} />
        </Section>

        <div className="my-2 rounded-xl bg-gradient-to-r from-primary via-primary to-primary/85 text-primary-foreground px-5 py-4 flex items-center justify-between shadow-lg ring-1 ring-primary/30">
          <div>
            <p className="text-sm uppercase tracking-wider font-bold opacity-90">Custo Industrial</p>
            <p className="text-xs opacity-70 mt-0.5">(1) = Diretos + Estaleiro</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold tabular-nums">{fmt(totals.custo_industrial)}</p>
        </div>

        <Separator />

        {/* TERRENO (2) */}
        <Section id="terreno" title="Custos do Terreno / Arranjos Exteriores - (2)" collapsed={isCol("terreno")} onToggle={() => toggleSection("terreno")} total={totals.total_terreno} totalLabel="Total C. Terreno">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <Label>Preço Aquisição Terreno (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.preco_aquisicao}
              onChange={(v) => patch("terrain", { ...details.terrain, preco_aquisicao: v })}
            />
          </div>
          <div>
            <Label>Área Terreno (m²)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.area_terreno ?? 0}
              onChange={(v) => {
                const precoM2 =
                  (details.terrain.area_terreno ?? 0) > 0
                    ? (details.terrain.preco_aquisicao || 0) /
                      (details.terrain.area_terreno as number)
                    : 0;
                patch("terrain", {
                  ...details.terrain,
                  area_terreno: v,
                  preco_aquisicao: precoM2 > 0 ? precoM2 * v : details.terrain.preco_aquisicao,
                });
              }}
            />
          </div>
          <div>
            <Label>Preço por m² do Terreno (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={
                (details.terrain.area_terreno ?? 0) > 0
                  ? (details.terrain.preco_aquisicao || 0) /
                    (details.terrain.area_terreno as number)
                  : 0
              }
              onChange={(v) => {
                const area = details.terrain.area_terreno ?? 0;
                if (area > 0) {
                  patch("terrain", { ...details.terrain, preco_aquisicao: v * area });
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              Custo Aquisição: {fmt(details.terrain.preco_aquisicao || 0)}
            </p>
          </div>
          <div>
            <Label>Nº de Frações no Terreno</Label>
            <NumCell
              readOnly={readOnly}
              value={details.header.num_fraccoes ?? 0}
              onChange={(v) => patch("header", { ...details.header, num_fraccoes: v || null })}
            />
          </div>
          <div>
            <Label>Custo Aquisição por Fração (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={
                (details.header.num_fraccoes ?? 0) > 0
                  ? (details.terrain.preco_aquisicao || 0) /
                    (details.header.num_fraccoes as number)
                  : 0
              }
              onChange={(v) => {
                const n = details.header.num_fraccoes ?? 0;
                if (n > 0) {
                  patch("terrain", { ...details.terrain, preco_aquisicao: v * n });
                }
              }}
            />
          </div>
          <div>
            <Label>Custo Loteamento / Infraestruturas - por Fração (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={
                (details.header.num_fraccoes ?? 0) > 0
                  ? (details.terrain.custo_loteamento || 0) /
                    (details.header.num_fraccoes as number)
                  : details.terrain.custo_loteamento
              }
              onChange={(v) => {
                const n = details.header.num_fraccoes ?? 0;
                patch("terrain", {
                  ...details.terrain,
                  custo_loteamento: n > 0 ? v * n : v,
                });
              }}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              Total: {fmt(details.terrain.custo_loteamento || 0)}
            </p>
          </div>
          <div>
            <Label>Taxa IMT (%)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.taxa_imt_pct * 100}
              onChange={(v) => patch("terrain", { ...details.terrain, taxa_imt_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              = {fmt((details.terrain.preco_aquisicao || 0) * (details.terrain.taxa_imt_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Imposto do Selo (%)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.imposto_selo_pct * 100}
              onChange={(v) => patch("terrain", { ...details.terrain, imposto_selo_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              = {fmt((details.terrain.preco_aquisicao || 0) * (details.terrain.imposto_selo_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Custos Notário (%)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.custos_notario_pct * 100}
              onChange={(v) =>
                patch("terrain", { ...details.terrain, custos_notario_pct: v / 100 })
              }
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              = {fmt((details.terrain.preco_aquisicao || 0) * (details.terrain.custos_notario_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Comissões Intermediários (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.comissoes_intermediarios}
              onChange={(v) =>
                patch("terrain", { ...details.terrain, comissoes_intermediarios: v })
              }
            />
          </div>
          <div>
            <Label>Ensaios Geotécnicos / Sondagens (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.ensaios_geotecnicos}
              onChange={(v) => patch("terrain", { ...details.terrain, ensaios_geotecnicos: v })}
            />
          </div>
          <div>
            <Label>Levantamento Topográfico (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.levantamento_topografico}
              onChange={(v) =>
                patch("terrain", { ...details.terrain, levantamento_topografico: v })
              }
            />
          </div>
          <div>
            <Label>Demolições Diversas (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.demolicoes_diversas}
              onChange={(v) => patch("terrain", { ...details.terrain, demolicoes_diversas: v })}
            />
          </div>
          <div>
            <Label>Arranjos Exteriores (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.terrain.arranjos_exteriores}
              onChange={(v) => patch("terrain", { ...details.terrain, arranjos_exteriores: v })}
            />
          </div>
        </div>
        <SubtotalRow label="TOTAL CUSTOS DO TERRENO" code="(2)" value={totals.total_terreno} />
        </Section>

        <Separator />

        {/* INDIRECTOS (3) */}
        <Section id="indiretos" title="Custos Indiretos - (3)" collapsed={isCol("indiretos")} onToggle={() => toggleSection("indiretos")} total={totals.total_indiretos} totalLabel="Total C. Indiretos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <Label>Honorários Técnicos (% s/ constr.)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.honorarios_tecnicos_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, honorarios_tecnicos_pct: v / 100, honorarios_tecnicos: 0 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.total_directos || 0) * (details.indirect.honorarios_tecnicos_pct ?? 0))}
            </p>
          </div>

          <div>
            <Label>Custos Financeiros (% s/ constr.)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.financeiros_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, financeiros_pct: v / 100, financeiros: 0 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.total_directos || 0) * (details.indirect.financeiros_pct ?? 0))}
            </p>
          </div>
          <div>
            <Label>Custos de Seguros (% s/ constr.)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.seguros_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, seguros_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.total_directos || 0) * (details.indirect.seguros_pct ?? 0))}
            </p>
          </div>

          <div>
            <Label>Taxas - Impostos - Encargos Prediais (% s/ constr.)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.taxas_impostos_prediais_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, taxas_impostos_prediais_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.total_directos || 0) * (details.indirect.taxas_impostos_prediais_pct ?? 0))}
            </p>
          </div>

          {/* Rubricas sobre Valor de Vendas */}
          <div>
            <Label>Publicidade / Marketing (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.publicidade_marketing_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, publicidade_marketing_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.indirect.publicidade_marketing_vendas_pct ?? 0))}
            </p>
          </div>
          <div>
            <Label>Honorários de Gestão e Custos Anexos (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.honorarios_gestao_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, honorarios_gestao_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.indirect.honorarios_gestao_vendas_pct ?? 0))}
            </p>
          </div>
          <div>
            <Label>Honorários de Comercialização (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.honorarios_comercializacao_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, honorarios_comercializacao_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.indirect.honorarios_comercializacao_vendas_pct ?? 0))}
            </p>
          </div>
          <div>
            <Label>Garantias / Pós-Venda (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.indirect.garantias_pos_venda_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("indirect", { ...details.indirect, garantias_pos_venda_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.indirect.garantias_pos_venda_vendas_pct ?? 0))}
            </p>
          </div>


        </div>
        <SubtotalRow label="TOTAL CUSTOS INDIRECTOS" code="(3)" value={totals.total_indiretos} />
        </Section>

        <Separator />

        {/* OUTROS (4) */}
        <Section id="outros" title="Outros Custos - (4)" collapsed={isCol("outros")} onToggle={() => toggleSection("outros")} total={totals.total_outros} totalLabel="Total Outros Custos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <Label>Projetos (Arq. + Especialidades) (% s/ constr.)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={details.other.projectos_pct * 100}
              onChange={(v) => patch("other", { ...details.other, projectos_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.total_directos || 0) * (details.other.projectos_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Contratos / Registos (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.other.contratos_registos_vendas_pct ?? 0) * 100}
              onChange={(v) =>
                patch("other", { ...details.other, contratos_registos_vendas_pct: v / 100 })
              }
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.other.contratos_registos_vendas_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Imprevistos / Áleas (% s/ Ind)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={details.other.imprevistos_aleas_pct * 100}
              onChange={(v) =>
                patch("other", { ...details.other, imprevistos_aleas_pct: v / 100 })
              }
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.custo_industrial || 0) * (details.other.imprevistos_aleas_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Outros (Taxas, Ramais, Baixadas, Vistorias) (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.other.outros_taxas_ramais}
              onChange={(v) =>
                patch("other", { ...details.other, outros_taxas_ramais: v, outros_taxas_ramais_pct: undefined })
              }
            />
          </div>
          <div>
            <Label>Controlo Qualidade / Certificações (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.other.controlo_qualidade}
              onChange={(v) => patch("other", { ...details.other, controlo_qualidade: v })}
            />
          </div>
          <div>
            <Label>Segurança & Higiene (€)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.other.seguranca_higiene}
              onChange={(v) => patch("other", { ...details.other, seguranca_higiene: v })}
            />
          </div>
        </div>
        <SubtotalRow label="TOTAL OUTROS CUSTOS" code="(4)" value={totals.total_outros} />
        </Section>

        <Separator />

        {/* ADMIN (5) */}
        <Section id="admin" title="Custos Administrativos - (5)" collapsed={isCol("admin")} onToggle={() => toggleSection("admin")} total={totals.total_admin} totalLabel="Total C. Admin">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <Label>Custos Estrutura / Fixos (Overhead) (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.admin.estrutura_overhead_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("admin", { ...details.admin, estrutura_overhead_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.admin.estrutura_overhead_vendas_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Fee Gestão Inter-Grupo (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.admin.fee_inter_grupo_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("admin", { ...details.admin, fee_inter_grupo_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.admin.fee_inter_grupo_vendas_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Outros Custos Administrativos (% s/ Vendas)</Label>
            <NumCell
              readOnly={readOnly}
              step="0.001"
              value={(details.admin.outros_administrativos_vendas_pct ?? 0) * 100}
              onChange={(v) => patch("admin", { ...details.admin, outros_administrativos_vendas_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.valor_vendas || 0) * (details.admin.outros_administrativos_vendas_pct || 0))}
            </p>
          </div>
        </div>
        <SubtotalRow label="TOTAL CUSTOS ADMINISTRATIVOS" code="(5)" value={totals.total_admin} />
        </Section>

        <Separator />

        {/* IVA (6) */}
        <Section id="iva" title="Custos de IVA - (6)" collapsed={isCol("iva")} onToggle={() => toggleSection("iva")} total={totals.total_iva} totalLabel="Total C. IVA" extra={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary hover:bg-primary/90 text-white" aria-label="Manual de Ajuda IVA">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md text-xs whitespace-pre-line leading-relaxed">
                {`Manual de Ajuda IVA

Não tem a certeza de qual a taxa de IVA aplicar em cada rubrica? Utilize as regras de ouro portuguesas:

- Construção Nova: Regra geral a taxa é 23% (Taxa Normal) na globalidade.

- Reabilitação Urbana (ARU): Se o imóvel estiver em zona ARU e tiver certificado camarário, aplica-se 6% a toda a empreitada.

- Reparação e Conservação de Habitação (Não ARU): A mão-de-obra tem taxa reduzida 6%. Os materiais apenas têm 6% se representarem menos de 20% do valor total do serviço. Caso os materiais ultrapassem 20%, pagam 23%.

- Autoliquidação de IVA (Inversão do sujeito passivo): Se factura a outra empresa de construção civil (B2B), a factura vai "Sem IVA" (Isento), aplicam a regra de inversão. Selecionar Isento !

- Trabalhador Independente com Isenção: Se factura menos de 14.500€/ano (Artigo 53º), fatura Isento.`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-end">
          <div className="flex items-center gap-2 pt-5">
            <Checkbox
              id="aru"
              checked={details.iva.zona_aru}
              disabled={readOnly}
              onCheckedChange={(c) =>
                setDetails((d) => {
                  const reduced = !!c || d.iva.zona_oru;
                  return {
                    ...d,
                    iva: {
                      ...d.iva,
                      zona_aru: !!c,
                      taxa_terreno_pct: reduced ? 0.06 : 0.23,
                      taxa_construcao_pct: reduced ? 0.06 : 0.23,
                      taxa_honorarios_pct: reduced ? 0.06 : 0.23,
                    },
                  };
                })
              }
            />
            <Label htmlFor="aru" className="text-xs">Terreno em zona ARU</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary hover:bg-primary/90 text-white" aria-label="Mais informação ARU/ORU">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-md text-xs whitespace-pre-line leading-relaxed">
                  {`Benefícios para proprietários, investidores e comunidades

As ARU/ORU trazem várias vantagens:

Assentam no Estatuto dos Benefícios Fiscais (arts. 45.º, 45.º-A e 71.º) e no Regime Financeiro das Autarquias Locais (Lei 73/2013, art. 16.º), que permite aos municípios aprovar isenções de IMI e IMT em ARU.

IVA reduzido: Taxa de 6% para empreitadas de reabilitação em imóveis localizados em ARU ou integradas em projetos de reconhecido interesse público (art. 18.º e verba 2.23 da Lista I do CIVA).

IMI: Isenção por três anos, renovável até cinco, para imóveis reabilitados situados em ARU (art. 45.º EBF).

IMT: Isenção na aquisição de imóveis destinados a reabilitação, se as obras começarem no prazo máximo de três anos. Isenção na primeira transmissão após a reabilitação, quando destinada a arrendamento permanente ou, se em ARU, a habitação própria e permanente. (art. 45.º-A EBF).`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Checkbox
              id="oru"
              checked={details.iva.zona_oru}
              disabled={readOnly}
              onCheckedChange={(c) =>
                setDetails((d) => {
                  const reduced = !!c || d.iva.zona_aru;
                  return {
                    ...d,
                    iva: {
                      ...d.iva,
                      zona_oru: !!c,
                      taxa_terreno_pct: reduced ? 0.06 : 0.23,
                      taxa_construcao_pct: reduced ? 0.06 : 0.23,
                      taxa_honorarios_pct: reduced ? 0.06 : 0.23,
                    },
                  };
                })
              }
            />
            <Label htmlFor="oru" className="text-xs">Terreno em zona ORU</Label>
          </div>
          <div />
          <div>
            <Label>Taxa de IVA Honorários Terreno/Arranjos Exteriores (%)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.iva.taxa_terreno_pct * 100}
              onChange={(v) => patch("iva", { ...details.iva, taxa_terreno_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt(
                ((details.terrain.custo_loteamento || 0) +
                  (details.terrain.ensaios_geotecnicos || 0) +
                  (details.terrain.comissoes_intermediarios || 0) +
                  (details.terrain.levantamento_topografico || 0) +
                  (details.terrain.demolicoes_diversas || 0) +
                  (details.terrain.arranjos_exteriores || 0)) *
                  (details.iva.taxa_terreno_pct || 0)
              )}
            </p>
          </div>
          <div>
            <Label>Taxa IVA Construção Civil (%)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.iva.taxa_construcao_pct * 100}
              onChange={(v) => patch("iva", { ...details.iva, taxa_construcao_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.base_iva_construcao || 0) * (details.iva.taxa_construcao_pct || 0))}
            </p>
          </div>
          <div>
            <Label>Taxa IVA Honorários & Outros (%)</Label>
            <NumCell
              readOnly={readOnly}
              value={details.iva.taxa_honorarios_pct * 100}
              onChange={(v) => patch("iva", { ...details.iva, taxa_honorarios_pct: v / 100 })}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              = {fmt((totals.base_iva_honorarios || 0) * (details.iva.taxa_honorarios_pct || 0))}
            </p>
          </div>
        </div>
        <SubtotalRow label="TOTAL IVA" code="(6)" value={totals.total_iva} />
        </Section>



        {/* CUSTO TOTAL */}
        <div className="my-2 rounded-xl bg-gradient-to-r from-primary via-primary to-primary/85 text-primary-foreground px-5 py-4 flex items-center justify-between shadow-lg ring-1 ring-primary/30">
          <div>
            <p className="uppercase tracking-wider opacity-90 text-base font-bold">Custo Total da Obra</p>
            <p className="text-[10px] opacity-70 mt-0.5">(1) + (2) + (3) + (4) + (5) + (6)</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold tabular-nums">{fmt(totals.custo_total)}</p>
        </div>

        {/* PROPOSTA VENDAS sobre o CUSTO TOTAL DA OBRA */}
        {(() => {
          const custoTotal = Number(totals.custo_total) || 0;
          const abpFromSales = details.sales.reduce(
            (s, l) => s + (Number(l.quantidade) || 0) * (Number(l.area_priv) || 0),
            0,
          );
          const abpEffective = details.statistics.area_construcao_override
            ? (details.statistics.area_construcao || 0)
            : abpFromSales;
          const numFraccoes = Number(details.header.num_fraccoes) ||
            details.sales.reduce((s, l) => s + (Number(l.quantidade) || 0), 0);

          const lucroDgPct = Number(details.validation.percentagem_lucro_alvo) || 0;
          const lucroAdmPct = Number(details.approvals.percentagem_lucro_admin ?? lucroDgPct) || 0;

          const calcPV = (pct: number) => (pct < 1 ? custoTotal / (1 - pct) : 0);
          const pvDg = calcPV(lucroDgPct);
          const pvAdm = calcPV(lucroAdmPct);

          const setLucroDg = (v: number) =>
            patch("validation", {
              ...details.validation,
              percentagem_lucro_alvo: Math.max(0, Math.min(99.99, v || 0)) / 100,
            });
          const setLucroAdm = (v: number) =>
            patch("approvals", {
              ...details.approvals,
              percentagem_lucro_admin: Math.max(0, Math.min(99.99, v || 0)) / 100,
            });

          const fmtPctInput = (pct: number) =>
            Number((pct * 100).toFixed(2)).toString();

          return (
            <Section
              id="proposta-vendas"
              title="Proposta Vendas sobre o Custo Total da Obra"
              collapsed={isCol("proposta-vendas")}
              onToggle={() => toggleSection("proposta-vendas")}
            >
              <div className="space-y-4">
                {/* Direção Geral */}
                <div className="grid grid-cols-12 gap-2 items-stretch">
                  <div className="col-span-12 md:col-span-2 flex flex-col gap-1">
                    <span className="text-xs font-semibold">Direção Geral</span>
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-2 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-amber-900/70 font-semibold">% Lucro</p>
                      <div className="flex items-center justify-center gap-0">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={99.99}
                          readOnly={readOnly}
                          defaultValue={fmtPctInput(lucroDgPct)}
                          key={`dg-${fmtPctInput(lucroDgPct)}`}
                          onBlur={(e) => setLucroDg(Number(e.target.value))}
                          className="w-10 bg-transparent text-right text-[1.35rem] font-bold text-amber-900 outline-none tabular-nums mr-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                        />
                        <span className="text-[1.35rem] font-bold text-amber-900">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-7 flex flex-col">
                    <p className="text-[11px] italic text-muted-foreground text-center mb-1">Validação Técnico-Económica</p>
                    <div className="flex-1 rounded-md bg-muted/60 border border-border flex items-center justify-center px-3 py-3">
                      <p className="text-2xl md:text-3xl font-bold tabular-nums">{fmt(pvDg)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-[60px_1fr_90px_140px] gap-2 items-center text-xs">
                      <Label className="text-xs">Ass.:</Label>
                      <TextCell
                        readOnly={readOnly}
                        value={details.validation.direccao_geral}
                        onChange={(v) => patch("validation", { ...details.validation, direccao_geral: v })}
                      />
                      <Label className="text-xs text-right">DATA:</Label>
                      <Input
                        type="date"
                        readOnly={readOnly}
                        value={details.approvals.aprovacao_inicial_data ?? ""}
                        onChange={(e) =>
                          patch("approvals", {
                            ...details.approvals,
                            aprovacao_inicial_data: e.target.value || null,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3 flex flex-col">
                    <p className="text-[11px] italic text-muted-foreground text-right mb-1">Valor Médio / fração</p>
                    <div className="flex-1 rounded-md bg-muted/60 border border-border px-3 py-3 text-right space-y-2">
                      <p className="text-base md:text-lg font-bold tabular-nums">
                        {fmtNumber(abpEffective > 0 ? pvDg / abpEffective : 0)} €/m²
                      </p>
                      <p className="text-base md:text-lg font-bold tabular-nums">
                        {fmtNumber(numFraccoes > 0 ? pvDg / numFraccoes : 0)} €/un
                      </p>
                    </div>
                  </div>
                </div>

                {/* Administração */}
                <div className="grid grid-cols-12 gap-2 items-stretch">
                  <div className="col-span-12 md:col-span-2 flex flex-col gap-1">
                    <span className="text-xs font-semibold">Administração</span>
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-2 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-amber-900/70 font-semibold">% Lucro</p>
                      <div className="flex items-center justify-center gap-0">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={99.99}
                          readOnly={readOnly}
                          defaultValue={fmtPctInput(lucroAdmPct)}
                          key={`adm-${fmtPctInput(lucroAdmPct)}`}
                          onBlur={(e) => setLucroAdm(Number(e.target.value))}
                          className="w-10 bg-transparent text-right text-[1.35rem] font-bold text-amber-900 outline-none tabular-nums mr-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                        />
                        <span className="text-[1.35rem] font-bold text-amber-900">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-7 flex flex-col">
                    <p className="text-[11px] italic text-muted-foreground text-center mb-1">Aprovação Inicial</p>
                    <div className="flex-1 rounded-md bg-muted/60 border border-border flex items-center justify-center px-3 py-3">
                      <p className="text-2xl md:text-3xl font-bold tabular-nums">{fmt(pvAdm)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-[60px_1fr_90px_140px] gap-2 items-center text-xs">
                      <Label className="text-xs">Ass.:</Label>
                      <TextCell
                        readOnly={readOnly}
                        value={details.approvals.administracao_nome}
                        onChange={(v) => patch("approvals", { ...details.approvals, administracao_nome: v })}
                      />
                      <Label className="text-xs text-right">DATA:</Label>
                      <Input
                        type="date"
                        readOnly={readOnly}
                        value={details.approvals.administracao_data ?? ""}
                        onChange={(e) =>
                          patch("approvals", {
                            ...details.approvals,
                            administracao_data: e.target.value || null,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3 flex flex-col">
                    <p className="text-[11px] italic text-muted-foreground text-right mb-1">Valor Médio / fração</p>
                    <div className="flex-1 rounded-md bg-muted/60 border border-border px-3 py-3 text-right space-y-2">
                      <p className="text-base md:text-lg font-bold tabular-nums">
                        {fmtNumber(abpEffective > 0 ? pvAdm / abpEffective : 0)} €/m²
                      </p>
                      <p className="text-base md:text-lg font-bold tabular-nums">
                        {fmtNumber(numFraccoes > 0 ? pvAdm / numFraccoes : 0)} €/un
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t text-xs">
                  <Label>Notas de Aprovação</Label>
                  <Textarea
                    readOnly={readOnly}
                    rows={2}
                    value={details.approvals.notas}
                    onChange={(e) =>
                      patch("approvals", { ...details.approvals, notas: e.target.value })
                    }
                  />
                </div>
              </div>
            </Section>
          );
        })()}

        {/* MAPA DE VENDAS */}
        <Section id="vendas" title="Mapa de Vendas Comercial - Decomposição das Frações" collapsed={isCol("vendas")} onToggle={() => toggleSection("vendas")} total={totals.valor_vendas} totalLabel="Vendas">

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipologia</TableHead>
              <TableHead className="w-[80px] text-right">Quant.</TableHead>
              <TableHead className="w-[110px] text-center">Área B.Priv (m²)</TableHead>
              <TableHead className="w-[120px] text-right">Preço m² (€)</TableHead>
              <TableHead className="w-[140px] text-right">Preço UN (€)</TableHead>
              <TableHead className="w-[160px] text-right">Total (€)</TableHead>
              {!readOnly && <TableHead className="w-[40px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.sales.map((line) => {
              const precoUn = (line.area_priv || 0) * (line.preco_m2 || 0);
              const total = precoUn * (line.quantidade || 0);
              return (
                <TableRow key={line.key}>
                  <TableCell>
                    <TextCell
                      readOnly={readOnly}
                      value={line.tipologia}
                      onChange={(v) => updateSalesLine(line.key, { tipologia: v })}
                      placeholder="Ex: MORADIAS T3 - A1"
                    />
                  </TableCell>
                  <TableCell>
                    <NumCell
                      readOnly={readOnly}
                      value={line.quantidade}
                      onChange={(v) => updateSalesLine(line.key, { quantidade: v })}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <NumCell
                      readOnly={readOnly}
                      value={line.area_priv}
                      onChange={(v) => updateSalesLine(line.key, { area_priv: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <NumCell
                      readOnly={readOnly}
                      value={line.preco_m2}
                      onChange={(v) => updateSalesLine(line.key, { preco_m2: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {fmt(precoUn)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(total)}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSalesLine(line.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            <TableRow className="bg-muted/40 font-bold">
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell className="text-right tabular-nums font-bold">{totalQt}</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                Rácio médio: {rácioMedio.toFixed(1)} m²
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                {totalArea > 0 ? `Rácio médio: ${fmt(totals.valor_vendas / totalArea)}/m²` : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                {totalQt > 0 ? `Rácio médio: ${fmt(totals.valor_vendas / totalQt)}` : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums font-extrabold text-base">{fmt(totals.valor_vendas)}</TableCell>
              {!readOnly && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addSalesLine} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar tipologia
          </Button>
        )}

        {/* ALERTA: Mapa de Vendas vs Proposta Inicial */}
        {(() => {
          const custoTotal = Number(totals.custo_total) || 0;
          const abpFromSales = details.sales.reduce(
            (s, l) => s + (Number(l.quantidade) || 0) * (Number(l.area_priv) || 0),
            0,
          );
          const abpEffective = details.statistics.area_construcao_override
            ? (details.statistics.area_construcao || 0)
            : abpFromSales;
          const lucroDgPct = Number(details.validation.percentagem_lucro_alvo) || 0;
          const lucroAdmPct = Number(details.approvals.percentagem_lucro_admin ?? lucroDgPct) || 0;
          const calcPV = (pct: number) => (pct < 1 ? custoTotal / (1 - pct) : 0);
          const proposta = calcPV(lucroAdmPct) || calcPV(lucroDgPct);
          const vendas = Number(totals.valor_vendas) || 0;
          const diferencialEur = vendas - proposta;
          const diferencialPct = proposta > 0 ? (diferencialEur / proposta) * 100 : 0;
          const superior = diferencialEur >= 0;
          const valorM2Vendas = abpEffective > 0 ? proposta / abpEffective : 0;

          const bgSoft = superior ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300";
          const bgStrong = superior ? "bg-emerald-500" : "bg-rose-500";
          const txtAccent = superior ? "text-emerald-700" : "text-rose-700";
          const boxAccent = superior
            ? "bg-white border-2 border-emerald-500 text-emerald-700"
            : "bg-rose-500 border-2 border-rose-700 text-white";

          return (
            <div className="mt-4 space-y-0 rounded-md overflow-hidden border-2 border-border">
              <div className={`${bgSoft} border-b-2 px-5 py-4 space-y-2`}>
                <div className="flex items-center justify-between gap-4 text-sm md:text-base">
                  <span className="font-bold uppercase tracking-wide">Valor de Vendas (Proposta):</span>
                  <span className="font-bold tabular-nums">{fmt(proposta)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm md:text-base">
                  <span className="font-bold uppercase tracking-wide">Valor (m²) das Vendas:</span>
                  <span className="font-bold italic tabular-nums">{fmtNumber(valorM2Vendas)} €/m²</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm md:text-base pt-1">
                  <span className="font-bold uppercase tracking-wide">Diferencial Proposta / Decomposição Vendas:</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-extrabold tabular-nums ${txtAccent}`}>
                      {diferencialPct >= 0 ? "+" : ""}{diferencialPct.toFixed(1).replace(".", ",")}%
                    </span>
                    <span className={`px-4 py-1.5 rounded-sm font-extrabold tabular-nums min-w-[160px] text-right ${boxAccent}`}>
                      {diferencialEur >= 0 ? "+" : ""}{fmt(diferencialEur)}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`${bgStrong} px-5 py-3 text-center`}>
                <p className="text-white font-extrabold italic uppercase tracking-wider text-base md:text-lg">
                  ***** {superior ? "Mapa Vendas Superior à Proposta Inicial" : "Mapa Vendas Inferior à Proposta Inicial"} *****
                </p>
              </div>
            </div>
          );
        })()}
        </Section>


        <Separator />

        {/* PROPOSTA FINAL - RAI */}
        <Section id="rai" title="Proposta Final | Venda - RAI" collapsed={isCol("rai")} onToggle={() => toggleSection("rai")} total={totals.rai_eur} totalLabel="RAI">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-md p-3">
            <p className="text-[13px] uppercase text-muted-foreground font-bold">Valor de Vendas Final</p>
            <p className="text-2xl font-extrabold tabular-nums">{fmt(totals.valor_vendas)}</p>
          </div>
          <div
            className={`rounded-md p-3 ${totals.rai_eur >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}
          >
            <p className="text-[13px] uppercase text-muted-foreground font-bold">RAI €</p>
            <p
              className={`text-2xl font-extrabold tabular-nums ${totals.rai_eur >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {fmt(totals.rai_eur)}
            </p>
          </div>
          <div
            className={`rounded-md p-3 ${totals.rai_pct >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}
          >
            <p className="text-[13px] uppercase text-muted-foreground font-bold">RAI %</p>
            <p
              className={`text-2xl font-extrabold tabular-nums ${totals.rai_pct >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {pct(totals.rai_pct)}
            </p>
          </div>
        </div>
        </Section>


        {/* ASSINATURAS / RODAPÉ */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t">
          <span>Criada em {format(new Date(sheet.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</span>
          {sheet.locked_at && (
            <span>Bloqueada em {format(new Date(sheet.locked_at), "dd/MM/yyyy HH:mm", { locale: pt })}</span>
          )}
        </div>
      </CardContent>

      <ClosingSheetSiteDetailDialog
        open={siteDetailOpen}
        onOpenChange={setSiteDetailOpen}
        closingSheetId={sheet.id}
        readOnly={readOnly}
      />
    </Card>
  );
}
