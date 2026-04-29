import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Layers, FileText } from "lucide-react";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanAnalysisResult } from "./PlanAIAnalysis";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Map of pageNumber -> analysis result (only analyzed pages). */
  resultsByPage: Record<number, PlanAnalysisResult>;
  obraId: string;
  planName?: string;
}

type SectionKey = "dimensions" | "rooms" | "elements";

const SECTION_LABEL: Record<SectionKey, string> = {
  dimensions: "Cotas",
  rooms: "Compartimentos",
  elements: "Elementos",
};

const SECTION_UNIT: Record<SectionKey, (item: any) => { unidade: string; quantidade: number; descricao: string }> = {
  dimensions: (d) => ({
    unidade: d.unit || "un",
    quantidade: Number(d.value) || 0,
    descricao: d.label || `Cota ${d.value} ${d.unit ?? ""}`.trim(),
  }),
  rooms: (r) => ({
    unidade: "m²",
    quantidade: Number(r.estimated_area) || 0,
    descricao: r.name || "Compartimento",
  }),
  elements: (e) => ({
    unidade: "un",
    quantidade: Number(e.count) || 1,
    descricao: e.label || e.type || "Elemento",
  }),
};

export function PlanAxiaBudgetSendDialog({
  open,
  onOpenChange,
  resultsByPage,
  obraId,
  planName,
}: Props) {
  const { orcamentos } = useOrcamentos();
  const obraOrcamentos = (orcamentos ?? []).filter((o) => o.obra_id === obraId);

  const pages = useMemo(
    () =>
      Object.keys(resultsByPage)
        .map(Number)
        .sort((a, b) => a - b),
    [resultsByPage],
  );

  const [orcamentoId, setOrcamentoId] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set(pages));
  const [includeSections, setIncludeSections] = useState<Record<SectionKey, boolean>>({
    dimensions: true,
    rooms: true,
    elements: true,
  });
  const [chapterPrefix, setChapterPrefix] = useState(
    planName ? `${planName} — Folha` : "Folha",
  );
  const [sending, setSending] = useState(false);

  // Recompute when pages change (e.g. dialog re-opened)
  useMemo(() => {
    setSelectedPages((prev) => {
      if (prev.size === 0) return new Set(pages);
      const next = new Set<number>();
      pages.forEach((p) => prev.has(p) && next.add(p));
      return next.size === 0 ? new Set(pages) : next;
    });
  }, [pages]);

  const togglePage = (p: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleSection = (k: SectionKey) => {
    setIncludeSections((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const preview = useMemo(() => {
    const chapters: Array<{ title: string; articles: number }> = [];
    let totalArticles = 0;
    for (const page of pages) {
      if (!selectedPages.has(page)) continue;
      const r = resultsByPage[page];
      let count = 0;
      if (includeSections.dimensions) count += r.dimensions?.length ?? 0;
      if (includeSections.rooms) count += r.rooms?.length ?? 0;
      if (includeSections.elements) count += r.elements?.length ?? 0;
      if (count === 0) continue;
      chapters.push({ title: `${chapterPrefix} ${page}`, articles: count });
      totalArticles += count;
    }
    return { chapters, totalArticles };
  }, [pages, selectedPages, resultsByPage, includeSections, chapterPrefix]);

  const handleSend = async () => {
    if (!orcamentoId) {
      toast.error("Selecione um orçamento");
      return;
    }
    if (preview.chapters.length === 0) {
      toast.error("Sem itens para enviar com os filtros atuais");
      return;
    }

    setSending(true);
    try {
      // Find next chapter number
      const { data: existing } = await supabase
        .from("capitulos_orcamento")
        .select("numero")
        .eq("orcamento_id", orcamentoId)
        .order("numero", { ascending: false })
        .limit(1);

      let nextNum = (existing && existing.length > 0 ? existing[0].numero : 0) + 1;
      let totalArticles = 0;

      for (const page of pages) {
        if (!selectedPages.has(page)) continue;
        const r = resultsByPage[page];

        const articles: Array<{
          descricao: string;
          unidade: string;
          quantidade: number;
        }> = [];

        (Object.keys(includeSections) as SectionKey[]).forEach((section) => {
          if (!includeSections[section]) return;
          const items = (r as any)[section] as any[] | undefined;
          if (!items) return;
          const sectionLabel = SECTION_LABEL[section];
          items.forEach((item) => {
            const norm = SECTION_UNIT[section](item);
            articles.push({
              descricao: `[${sectionLabel}] ${norm.descricao}`,
              unidade: norm.unidade,
              quantidade: norm.quantidade,
            });
          });
        });

        if (articles.length === 0) continue;

        const { data: chapter, error: chErr } = await supabase
          .from("capitulos_orcamento")
          .insert({
            orcamento_id: orcamentoId,
            numero: nextNum,
            titulo: `${chapterPrefix} ${page}`,
            ordem: nextNum,
          })
          .select()
          .single();
        if (chErr) throw chErr;

        const rows = articles.map((a, idx) => ({
          capitulo_id: chapter.id,
          descricao: a.descricao,
          unidade: a.unidade,
          quantidade: a.quantidade,
          preco_unitario: 0,
          ordem: idx + 1,
        }));

        const { error: artErr } = await supabase
          .from("artigos_orcamento")
          .insert(rows);
        if (artErr) throw artErr;

        totalArticles += rows.length;
        nextNum++;
      }

      toast.success(
        `${totalArticles} artigo(s) enviados em ${preview.chapters.length} capítulo(s)`,
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e.message ?? e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Enviar análise Axia™ para Orçamento
          </DialogTitle>
          <DialogDescription>
            A Axia cria um capítulo por folha analisada, com cotas, compartimentos
            e elementos como artigos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Orçamento */}
          <div className="space-y-1.5">
            <Label className="text-xs">Orçamento de destino</Label>
            <Select value={orcamentoId} onValueChange={setOrcamentoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar orçamento desta obra…" />
              </SelectTrigger>
              <SelectContent>
                {obraOrcamentos.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Nenhum orçamento nesta obra
                  </SelectItem>
                ) : (
                  obraOrcamentos.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.titulo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter prefix */}
          <div className="space-y-1.5">
            <Label className="text-xs">Prefixo do capítulo</Label>
            <Input
              value={chapterPrefix}
              onChange={(e) => setChapterPrefix(e.target.value)}
              placeholder="ex.: Folha"
            />
            <p className="text-[10px] text-muted-foreground">
              Cada capítulo será nomeado: <span className="font-mono">{chapterPrefix} 1</span>, <span className="font-mono">{chapterPrefix} 2</span>, …
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-1.5">
            <Label className="text-xs">Secções a incluir</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SECTION_LABEL) as SectionKey[]).map((k) => (
                <label
                  key={k}
                  className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40 text-sm"
                >
                  <Checkbox
                    checked={includeSections[k]}
                    onCheckedChange={() => toggleSection(k)}
                  />
                  {SECTION_LABEL[k]}
                </label>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Folhas a enviar</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setSelectedPages(new Set(pages))}
                >
                  Todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setSelectedPages(new Set())}
                >
                  Nenhuma
                </Button>
              </div>
            </div>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-1">
                {pages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma folha analisada.
                  </p>
                ) : (
                  pages.map((p) => {
                    const r = resultsByPage[p];
                    const total =
                      (r.dimensions?.length ?? 0) +
                      (r.rooms?.length ?? 0) +
                      (r.elements?.length ?? 0);
                    return (
                      <label
                        key={p}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedPages.has(p)}
                          onCheckedChange={() => togglePage(p)}
                        />
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">Folha {p}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {total} item(s)
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Pré-visualização: {preview.chapters.length} capítulo(s),{" "}
              {preview.totalArticles} artigo(s)
            </div>
            {preview.chapters.length > 0 && (
              <div className="border rounded-md max-h-32 overflow-auto divide-y">
                {preview.chapters.map((c) => (
                  <div
                    key={c.title}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <span className="font-medium">{c.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {c.articles} artigo(s)
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sending || !orcamentoId || preview.chapters.length === 0
            }
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Enviar para orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
