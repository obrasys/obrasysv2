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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Layers } from "lucide-react";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanQuantitativoRow } from "@/hooks/usePlanQuantitativos";

type GroupBy = "source" | "camada" | "floor" | "single";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: PlanQuantitativoRow[];
  obraId: string;
  planName?: string;
  floorMap?: Map<string, string>;
}

const SOURCE_LABEL: Record<string, string> = {
  medicao: "Medições",
  compartimento: "Compartimentos",
  especialidade: "Especialidades",
  escada: "Escadas",
  outros: "Outros",
};

export function PlanBudgetSendDialog({
  open,
  onOpenChange,
  rows,
  obraId,
  planName,
  floorMap,
}: Props) {
  const { orcamentos } = useOrcamentos();
  const obraOrcamentos = (orcamentos ?? []).filter((o) => o.obra_id === obraId);

  const [orcamentoId, setOrcamentoId] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("source");
  const [chapterTitle, setChapterTitle] = useState(
    planName ? `Quantitativos — ${planName}` : "Quantitativos da Planta",
  );
  const [sending, setSending] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, PlanQuantitativoRow[]>();
    for (const r of rows) {
      let key: string;
      if (groupBy === "single") key = chapterTitle || "Quantitativos";
      else if (groupBy === "source") key = SOURCE_LABEL[r.source] ?? r.source;
      else if (groupBy === "camada") key = r.camada || "Geral";
      else key = r.floor_id ? floorMap?.get(r.floor_id) ?? "Pavimento" : "Sem pavimento";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [rows, groupBy, chapterTitle, floorMap]);

  const handleSend = async () => {
    if (!orcamentoId) {
      toast.error("Selecione um orçamento");
      return;
    }
    if (rows.length === 0) {
      toast.error("Sem linhas para enviar");
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
      for (const [title, items] of groups) {
        const { data: chapter, error: chErr } = await supabase
          .from("capitulos_orcamento")
          .insert({
            orcamento_id: orcamentoId,
            numero: nextNum,
            titulo: title,
            ordem: nextNum,
          })
          .select()
          .single();
        if (chErr) throw chErr;

        const articles = items.map((r, idx) => ({
          capitulo_id: chapter.id,
          descricao: r.descricao,
          unidade: r.unidade,
          quantidade: Number(r.valor) || 0,
          preco_unitario: 0,
          ordem: idx + 1,
        }));
        if (articles.length > 0) {
          const { error: artErr } = await supabase
            .from("artigos_orcamento")
            .insert(articles);
          if (artErr) throw artErr;
          totalArticles += articles.length;
        }
        nextNum++;
      }

      toast.success(
        `${totalArticles} artigo(s) enviados em ${groups.length} capítulo(s)`,
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
            Enviar para Orçamento
          </DialogTitle>
          <DialogDescription>
            {rows.length} quantitativo(s) selecionados. A Axia organiza-os em
            capítulos e artigos, mantendo as unidades originais.
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

          {/* Group by */}
          <div className="space-y-1.5">
            <Label className="text-xs">Organizar capítulos por</Label>
            <RadioGroup
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as GroupBy)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { v: "source", l: "Tipo (medição, escada, …)" },
                { v: "camada", l: "Camada técnica" },
                { v: "floor", l: "Pavimento" },
                { v: "single", l: "Capítulo único" },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40 text-sm"
                >
                  <RadioGroupItem value={opt.v} />
                  {opt.l}
                </label>
              ))}
            </RadioGroup>
          </div>

          {groupBy === "single" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Título do capítulo</Label>
              <Input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
              />
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Pré-visualização: {groups.length} capítulo(s), {rows.length} artigo(s)
            </div>
            {rows.filter((r) => !Number(r.valor)).length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                ⚠️ {rows.filter((r) => !Number(r.valor)).length} item(s) sem quantidade
                (valor 0). Para vãos, rodapé e paredes, volte a executar a
                leitura da planta com a Axia — ela passou a calcular as
                quantidades automaticamente. Em alternativa, edite os valores
                na Tabela Unificada antes de enviar.
              </div>
            )}
            <div className="border rounded-md max-h-48 overflow-auto divide-y">
              {groups.map(([title, items]) => (
                <div key={title} className="p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {items.length} artigo(s)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || !orcamentoId}>
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
