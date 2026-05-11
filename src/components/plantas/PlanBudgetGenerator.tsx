import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PlanMeasurement, PlanMeasurementMapping } from "@/types/plan-measurements";
import { autoMatchPlaceholdersAgainstBase, type BaseArticleMatch, type PlaceholderToMatch } from "@/lib/plan-base-precos-matching";
import type { TipoBase } from "@/hooks/useBaseArtigos";
import { buildDedupePayload } from "@/lib/plan-dedupe";
import { DISCIPLINE_META } from "@/lib/plan-discipline";

// ─────────────────────────────────────────────────────────────────────────────
// Categorização inteligente (capítulos do orçamento)
// Usa camada/etiqueta dos measurements derivados pela Axia para agrupar por
// especialidade em vez de cair tudo em "A definir (revisão manual)".
// ─────────────────────────────────────────────────────────────────────────────
type DerivedBucket =
  | "Vãos — Portas e Janelas"
  | "Acabamentos — Rodapé"
  | "Acabamentos — Paredes"
  | "Acabamentos — Pavimentos e Tetos"
  | "A definir (revisão manual)";

function categorizeMeasurement(m: PlanMeasurement): DerivedBucket {
  const camada = (m.camada ?? "").toLowerCase();
  const etiqueta = (m.etiqueta ?? "").toLowerCase();
  if (camada === "rodape" || etiqueta.startsWith("rodapé")) return "Acabamentos — Rodapé";
  if (camada === "paredes" || etiqueta.startsWith("paredes")) return "Acabamentos — Paredes";
  if (camada === "pavimento" || camada === "teto" || etiqueta.startsWith("pavimento") || etiqueta.startsWith("teto"))
    return "Acabamentos — Pavimentos e Tetos";
  return "A definir (revisão manual)";
}

interface PlacedOpening {
  symbol_type_id: string;
  subcategory: string | null;
  quantity: number;
}

interface Article {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
}

interface ConsolidatedItem {
  artigoId: string;
  article: Article;
  categoria: string;
  quantidade: number;
  valorTotal: number;
  measurementIds: string[];
}

interface Props {
  obraId: string;
  planId: string;
  planName: string;
  measurements: PlanMeasurement[];
  mappings: PlanMeasurementMapping[];
  articles: Article[];
  tipoBase?: TipoBase;
  disciplina?: import("@/types/plan-measurements").PlanDisciplina | null;
  /** When true, opens the dialog immediately on mount (used by deep links). */
  autoOpen?: boolean;
}

export function PlanBudgetGenerator({ obraId, planId, planName, measurements, mappings, articles, tipoBase = "geral", disciplina, autoOpen = false }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(autoOpen);
  const disciplineLabel = disciplina && disciplina !== "arquitetura" && disciplina !== "estruturas"
    ? DISCIPLINE_META[disciplina]?.label
    : null;
  const chapterPrefix = disciplineLabel ? `${disciplineLabel} — ` : "";
  const [titulo, setTitulo] = useState(disciplineLabel ? `${disciplineLabel} — ${planName}` : `Pré-Orçamento — ${planName}`);
  const [margemLucro, setMargemLucro] = useState("15");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openings, setOpenings] = useState<PlacedOpening[]>([]);
  const [autoMatches, setAutoMatches] = useState<Map<string, BaseArticleMatch>>(new Map());
  const [isMatching, setIsMatching] = useState(false);

  // Buscar vãos (portas/janelas) inseridos pela Axia em plan_placed_elements
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from("plan_placed_elements")
        .select("symbol_type_id, subcategory, quantity")
        .eq("plan_import_id", planId)
        .eq("category", "vaos");
      if (error || cancel) return;
      setOpenings((data ?? []) as PlacedOpening[]);
    })();
    return () => {
      cancel = true;
    };
  }, [planId]);

  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    articles.forEach((a) => map.set(a.id, a));
    return map;
  }, [articles]);

  const measurementById = useMemo(() => {
    const map = new Map<string, PlanMeasurement>();
    measurements.forEach((m) => map.set(m.id, m));
    return map;
  }, [measurements]);

  // Consolidate mapped measurements by article, grouped by category.
  // Fallback: if a measurement is not mapped to an article, create a
  // placeholder article grouped by tipo/etiqueta so the budget is never empty.
  const consolidated = useMemo(() => {
    const byArticle = new Map<string, ConsolidatedItem>();
    const mappingByMeasurement = new Map<string, PlanMeasurementMapping>();
    mappings.forEach((mp) => mappingByMeasurement.set(mp.measurement_id, mp));

    measurements.forEach((measurement) => {
      const mapping = mappingByMeasurement.get(measurement.id);
      const isMapped = mapping?.estado === "mapeado" && !!mapping?.artigo_base_id;

      if (isMapped) {
        const article = articleById.get(mapping!.artigo_base_id!);
        if (!article) return;
        const qtd =
          (measurement.valor_ajustado ?? measurement.valor_bruto) *
          (mapping!.coeficiente ?? 1) *
          (mapping!.fator_desperdicio ?? 1);

        if (!byArticle.has(article.id)) {
          byArticle.set(article.id, {
            artigoId: article.id,
            article,
            categoria: article.categoria || "Geral",
            quantidade: 0,
            valorTotal: 0,
            measurementIds: [],
          });
        }
        const row = byArticle.get(article.id)!;
        row.quantidade += qtd;
        row.valorTotal += qtd * article.preco_unitario;
        row.measurementIds.push(measurement.id);
      } else {
        // Categorização inteligente para derivados da Axia (rodapé, paredes,
        // pavimento/teto). Cada categoria vira um capítulo dedicado e os
        // items derivados são consolidados num único artigo "A DEFINIR" com a
        // soma da quantidade — o utilizador atribui o preço unitário no editor.
        const bucket = categorizeMeasurement(measurement);
        // Normalizar unidade: m² para áreas, ml para lineares
        const rawUnit = (measurement.unidade || "").toLowerCase();
        const unidade =
          measurement.tipo === "area"
            ? "m²"
            : measurement.tipo === "linha"
            ? "ml"
            : rawUnit || "un";

        let descricao: string;
        let placeholderId: string;
        if (bucket === "Acabamentos — Rodapé") {
          descricao = "Rodapé — fornecimento e aplicação";
          placeholderId = `derived::rodape::${unidade}`;
        } else if (bucket === "Acabamentos — Paredes") {
          descricao = "Paredes — revestimento/pintura";
          placeholderId = `derived::paredes::${unidade}`;
        } else if (bucket === "Acabamentos — Pavimentos e Tetos") {
          const isTeto = (measurement.camada ?? "").toLowerCase() === "teto" ||
            (measurement.etiqueta ?? "").toLowerCase().startsWith("teto");
          descricao = isTeto ? "Teto — pintura/acabamento" : "Pavimento — fornecimento e aplicação";
          placeholderId = `derived::${isTeto ? "teto" : "pavimento"}::${unidade}`;
        } else {
          descricao =
            measurement.etiqueta?.trim() ||
            (measurement.tipo === "area"
              ? "Áreas a definir"
              : measurement.tipo === "linha"
              ? "Lineares a definir"
              : "Contagens a definir");
          placeholderId = `placeholder::${measurement.tipo}::${descricao}`;
        }

        const qtd = measurement.valor_ajustado ?? measurement.valor_bruto ?? 0;

        if (!byArticle.has(placeholderId)) {
          byArticle.set(placeholderId, {
            artigoId: placeholderId,
            article: {
              id: placeholderId,
              codigo: "A DEFINIR",
              descricao,
              unidade,
              preco_unitario: 0,
              categoria: bucket,
            },
            categoria: bucket,
            quantidade: 0,
            valorTotal: 0,
            measurementIds: [],
          });
        }
        const row = byArticle.get(placeholderId)!;
        row.quantidade += qtd;
        row.measurementIds.push(measurement.id);
      }
    });

    // Adicionar vãos (portas/janelas) agrupados por dimensão como capítulo dedicado
    const openingsBucket = new Map<string, { descricao: string; qtd: number }>();
    openings.forEach((o) => {
      // symbol_type_id formato: "porta_interior_80x210" — usamos como chave
      const key = o.symbol_type_id;
      const descricao = o.subcategory?.trim() || o.symbol_type_id;
      const existing = openingsBucket.get(key);
      if (existing) existing.qtd += o.quantity ?? 1;
      else openingsBucket.set(key, { descricao, qtd: o.quantity ?? 1 });
    });
    openingsBucket.forEach((v, key) => {
      byArticle.set(`opening::${key}`, {
        artigoId: `opening::${key}`,
        article: {
          id: `opening::${key}`,
          codigo: "VÃO",
          descricao: v.descricao,
          unidade: "un",
          preco_unitario: 0,
          categoria: "Vãos — Portas e Janelas",
        },
        categoria: "Vãos — Portas e Janelas",
        quantidade: v.qtd,
        valorTotal: 0,
        measurementIds: [],
      });
    });

    return Array.from(byArticle.values()).sort((a, b) => a.categoria.localeCompare(b.categoria));
  }, [mappings, measurements, measurementById, articleById, openings]);

  // Apply auto-matches: substitui código/descrição/preço dos placeholders/vãos
  // que tiveram match contra a Base (user ou global). Recalcula valorTotal.
  const consolidatedEnriched = useMemo(() => {
    if (autoMatches.size === 0) return consolidated;
    return consolidated.map((item) => {
      const match = autoMatches.get(item.artigoId);
      if (!match) return item;
      const newArticle: Article = {
        ...item.article,
        codigo: match.codigo || item.article.codigo,
        descricao: match.descricao || item.article.descricao,
        unidade: match.unidade || item.article.unidade,
        preco_unitario: match.preco_unitario,
      };
      return {
        ...item,
        article: newArticle,
        valorTotal: item.quantidade * match.preco_unitario,
      };
    });
  }, [consolidated, autoMatches]);

  // Group by category for chapters
  const chapters = useMemo(() => {
    const map = new Map<string, ConsolidatedItem[]>();
    consolidatedEnriched.forEach((item) => {
      if (!map.has(item.categoria)) map.set(item.categoria, []);
      map.get(item.categoria)!.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [consolidatedEnriched]);

  const totalGeral = useMemo(
    () => consolidatedEnriched.reduce((acc, r) => acc + r.valorTotal, 0),
    [consolidatedEnriched]
  );

  const unmappedCount = measurements.filter((m) => {
    const mapping = mappings.find((mp) => mp.measurement_id === m.id);
    return !mapping || mapping.estado !== "mapeado" || !mapping.artigo_base_id;
  }).length;
  const itemsWithoutPrice = consolidatedEnriched.filter((c) => c.article.preco_unitario === 0).length;
  const itemsAutoMatched = autoMatches.size;
  const itemsAutoMatchedFromGlobal = Array.from(autoMatches.values()).filter((m) => m.origem === "global").length;

  // Disparar auto-match contra a Base quando o diálogo abre (placeholders + vãos)
  useEffect(() => {
    if (!showDialog || !user) return;
    const targets: PlaceholderToMatch[] = consolidated
      .filter((c) => c.artigoId.startsWith("derived::") || c.artigoId.startsWith("opening::") || c.artigoId.startsWith("placeholder::"))
      .map((c) => ({
        key: c.artigoId,
        descricao: c.article.descricao,
        unidade: c.article.unidade,
        capituloHint: c.categoria,
        keywords: c.article.descricao.split(/[\s—\-]+/).filter((w) => w.length > 3).slice(0, 4),
      }));
    if (targets.length === 0) {
      setAutoMatches(new Map());
      return;
    }
    let cancel = false;
    setIsMatching(true);
    autoMatchPlaceholdersAgainstBase(targets, tipoBase, user.id)
      .then((m) => {
        if (!cancel) setAutoMatches(m);
      })
      .catch((e) => console.warn("Auto-match falhou:", e))
      .finally(() => !cancel && setIsMatching(false));
    return () => {
      cancel = true;
    };
  }, [showDialog, consolidated, tipoBase, user]);


  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);

    try {
      // 1. Generate orcamento code
      const { data: codigo, error: codeErr } = await supabase.rpc("generate_orcamento_codigo", { p_user_id: user.id });
      if (codeErr) throw codeErr;

      // 2. Create orcamento
      const { data: orcamento, error: orcErr } = await supabase
        .from("orcamentos")
        .insert({
          user_id: user.id,
          titulo,
          codigo,
          obra_id: obraId,
          margem_lucro: parseFloat(margemLucro) || 0,
          status: "rascunho",
        })
        .select()
        .single();
      if (orcErr) throw orcErr;

      // 3. Create chapters (one per category)
      const chapterInserts = chapters.map(([cat], idx) => ({
        orcamento_id: orcamento.id,
        numero: idx + 1,
        titulo: `${chapterPrefix}${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        ordem: idx + 1,
      }));

      const { data: createdChapters, error: chapErr } = await supabase
        .from("capitulos_orcamento")
        .insert(chapterInserts)
        .select();
      if (chapErr) throw chapErr;

      // Map category → chapter ID
      const chapterIdByCategory = new Map<string, string>();
      createdChapters.forEach((ch, idx) => {
        const [cat] = chapters[idx];
        chapterIdByCategory.set(cat, ch.id);
      });

      // 4. Create artigos_orcamento — manter referência ao item consolidado
      //    para podermos criar plan_budget_links com o artigo_orcamento_id real.
      type ArtigoInsert = {
        capitulo_id: string;
        codigo: string;
        descricao: string;
        unidade: string;
        quantidade: number;
        preco_unitario: number;
        ordem: number;
        quantity_source: string;
        linked_element_id: string | null;
        margem_lucro_artigo: number;
      };
      const artigoInserts: ArtigoInsert[] = [];
      const insertedItemRef: ConsolidatedItem[] = []; // paralelo a artigoInserts

      chapters.forEach(([cat, items]) => {
        const capituloId = chapterIdByCategory.get(cat);
        if (!capituloId) return;

        items.forEach((item, idx) => {
          artigoInserts.push({
            capitulo_id: capituloId,
            codigo: item.article.codigo,
            descricao: item.article.descricao,
            unidade: item.article.unidade,
            quantidade: parseFloat(item.quantidade.toFixed(2)),
            preco_unitario: item.article.preco_unitario,
            ordem: idx + 1,
            quantity_source: "plan_measurement",
            linked_element_id: null,
            margem_lucro_artigo: 0,
          });
          insertedItemRef.push(item);
        });
      });

      let createdArtigos: Array<{ id: string }> = [];
      if (artigoInserts.length > 0) {
        const { data: arts, error: artErr } = await supabase
          .from("artigos_orcamento")
          .insert(artigoInserts)
          .select("id");
        if (artErr) throw artErr;
        createdArtigos = arts ?? [];
      }

      // 5. Create plan_budget_links — agora com artigo_orcamento_id REAL e dedupe_key
      const linkInserts: Array<{
        measurement_id: string;
        user_id: string;
        orcamento_id: string;
        artigo_orcamento_id: string;
        dedupe_key: string;
        source_type: string;
        source_id: string | null;
        quantity_origin: string | null;
        validation_status: string | null;
      }> = [];
      createdArtigos.forEach((art, i) => {
        const item = insertedItemRef[i];
        if (!item) return;
        item.measurementIds.forEach((mId) => {
          const m = measurements.find((mm) => mm.id === mId);
          const dedupe = buildDedupePayload({
            planImportId: planId,
            roomName: m?.etiqueta ?? null,
            actionType: m?.action_type ?? null,
            unidade: m?.unidade ?? item.article.unidade,
            primaryDimension: typeof item.quantidade === "number" ? item.quantidade : null,
            sourceType: "manual_measurement",
            sourceId: mId,
            artigoOrcamentoId: art.id,
          }, {
            quantityOrigin: "plan_measurement",
            validationStatus: m?.estado_validacao ?? null,
          });
          linkInserts.push({
            measurement_id: mId,
            user_id: user.id,
            orcamento_id: orcamento.id,
            artigo_orcamento_id: art.id,
            ...dedupe,
          });
        });
      });

      if (linkInserts.length > 0) {
        const { error: linkErr } = await supabase
          .from("plan_budget_links")
          .upsert(linkInserts as any, { onConflict: "orcamento_id,dedupe_key", ignoreDuplicates: true } as any);
        if (linkErr) {
          console.warn("Budget links creation warning:", linkErr.message);
        }
      }

      // 6. Update plan status
      await supabase.from("plan_imports").update({ status: "validada" }).eq("id", planId);

      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["plan-imports"] });

      toast.success(`Pré-orçamento "${titulo}" criado com ${artigoInserts.length} artigos em ${chapters.length} capítulos`);
      setShowDialog(false);
      navigate(`/orcamentos/${orcamento.id}/editar`);
    } catch (err: any) {
      toast.error("Erro ao gerar pré-orçamento: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = consolidatedEnriched.length > 0 || measurements.length > 0 || openings.length > 0;

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={!canGenerate}
        className="gap-1.5"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Gerar Pré-Orçamento
      </Button>

      <Dialog open={showDialog} onOpenChange={(open) => !isGenerating && setShowDialog(open)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Pré-Orçamento a partir da Planta</DialogTitle>
            <DialogDescription>
              Consolidar medições mapeadas e criar um orçamento com capítulos e artigos automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Auto-match status */}
            {isMatching && (
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  A procurar preços na sua Base ({tipoBase === "remodelacao" ? "Remodelação" : "Geral"}) e na Base Global…
                </p>
              </div>
            )}
            {!isMatching && itemsAutoMatched > 0 && (
              <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  <strong>{itemsAutoMatched}</strong> artigo(s) com preço auto-preenchido a partir da Base
                  {itemsAutoMatchedFromGlobal > 0 && (
                    <> (incluindo <strong>{itemsAutoMatchedFromGlobal}</strong> da Base Global)</>
                  )}.
                </p>
              </div>
            )}
            {!isMatching && itemsWithoutPrice > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>{itemsWithoutPrice}</strong> artigo(s) ainda sem preço unitário. Vai poder atribuir o preço diretamente no editor do orçamento.
                </p>
              </div>
            )}
            {/* Warnings */}
            {unmappedCount > 0 && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {unmappedCount} medição(ões) não foram mapeadas manualmente a artigos. A Axia tentou auto-preencher pelo capítulo e descrição.
                </p>
              </div>
            )}

            {/* Config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Título do Orçamento</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Margem de Lucro (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={margemLucro}
                  onChange={(e) => setMargemLucro(e.target.value)}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{chapters.length}</p>
                <p className="text-[10px] text-muted-foreground">Capítulos</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{consolidated.length}</p>
                <p className="text-[10px] text-muted-foreground">Artigos</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">
                  {totalGeral.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                </p>
                <p className="text-[10px] text-muted-foreground">Valor Base</p>
              </div>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Un.</TableHead>
                    <TableHead className="text-right">P.Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapters.map(([cat, items]) => (
                    <>
                      <TableRow key={`cap-${cat}`} className="bg-muted/50">
                        <TableCell colSpan={6} className="font-medium text-xs py-1.5">
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </TableCell>
                      </TableRow>
                      {items.map((item) => (
                        <TableRow key={item.artigoId}>
                          <TableCell className="font-mono text-[11px]">{item.article.codigo}</TableCell>
                          <TableCell className="text-xs max-w-48 truncate">{item.article.descricao}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.quantidade.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{item.article.unidade}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.article.preco_unitario.toFixed(2)} €</TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">{item.valorTotal.toFixed(2)} €</TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !titulo.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Gerar Orçamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
