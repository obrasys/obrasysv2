import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ArtigoOrcamento, Capitulo } from "@/types/orcamentos";
import { chapterKey, classifyItem, type BudgetComparison, type ItemChangeStatus } from "@/hooks/useBudgetComparison";

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

const statusStyle: Record<ItemChangeStatus, string> = {
  original: "bg-muted text-muted-foreground",
  alterado: "bg-amber-100 text-amber-700",
  novo: "bg-emerald-100 text-emerald-700",
};

interface Props {
  capitulo: Capitulo & { artigos?: ArtigoOrcamento[] };
  comparison: BudgetComparison;
  readOnly: boolean;
  onAddArtigo: (capituloId: string) => void;
  onEditArtigo: (artigo: ArtigoOrcamento) => void;
  onDeleteArtigo: (artigoId: string) => void;
  onEditCapitulo: (capituloId: string) => void;
  onDeleteCapitulo: (capituloId: string) => void;
  onUpdateQuantidade: (artigoId: string, quantidade: number) => void;
  onUpdateCustoVenda: (artigoId: string, payload: { preco_base?: number; preco_unitario?: number }) => void;
}

export function BudgetChapterAccordion({
  capitulo,
  comparison,
  readOnly,
  onAddArtigo,
  onEditArtigo,
  onDeleteArtigo,
  onEditCapitulo,
  onDeleteCapitulo,
  onUpdateQuantidade,
  onUpdateCustoVenda,
}: Props) {
  const [open, setOpen] = useState(true);
  const k = chapterKey(capitulo);
  const baseCap = comparison.baseChaptersByKey.get(k);

  const totals = useMemo(() => {
    let custo = 0;
    let venda = 0;
    for (const a of capitulo.artigos ?? []) {
      custo += Number(a.preco_base ?? a.preco_unitario ?? 0) * Number(a.quantidade ?? 0);
      venda += Number(a.valor_total ?? Number(a.preco_unitario ?? 0) * Number(a.quantidade ?? 0));
    }
    let baseVenda = 0;
    for (const a of baseCap?.artigos ?? []) {
      baseVenda += Number(a.valor_total ?? Number(a.preco_unitario ?? 0) * Number(a.quantidade ?? 0));
    }
    const margemPct = custo > 0 ? ((venda - custo) / venda) * 100 : 0;
    return { custo, venda, baseVenda, deltaVenda: venda - baseVenda, margemPct };
  }, [capitulo, baseCap]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted shrink-0"
          aria-label={open ? "Recolher" : "Expandir"}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
          {capitulo.numero}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{capitulo.titulo}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {(capitulo.artigos?.length ?? 0)} artigos · Margem {totals.margemPct.toFixed(1)}%
          </p>
        </div>
        <div className="hidden md:flex items-center gap-5 text-right">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Custo</p>
            <p className="text-sm font-medium">{fmtEUR(totals.custo)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Venda</p>
            <p className="text-sm font-semibold">{fmtEUR(totals.venda)}</p>
          </div>
          <div className="w-24">
            <p className="text-[10px] uppercase text-muted-foreground">Δ vs Base</p>
            <p
              className={`text-sm font-medium ${
                totals.deltaVenda > 0 ? "text-rose-600" : totals.deltaVenda < 0 ? "text-emerald-600" : ""
              }`}
            >
              {totals.deltaVenda === 0 ? "—" : fmtEUR(totals.deltaVenda)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => onAddArtigo(capitulo.id)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Artigo
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditCapitulo(capitulo.id)} disabled={readOnly}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar capítulo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteCapitulo(capitulo.id)}
                disabled={readOnly}
                className="text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar capítulo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {open && (
        <div className="border-t overflow-x-auto">
          {(capitulo.artigos?.length ?? 0) === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sem artigos neste capítulo.
              {!readOnly && (
                <Button size="sm" variant="link" onClick={() => onAddArtigo(capitulo.id)}>
                  Adicionar primeiro artigo
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-24">Código</th>
                  <th className="text-left font-medium px-3 py-2">Descrição</th>
                  <th className="text-left font-medium px-3 py-2 w-16">Un.</th>
                  <th className="text-right font-medium px-3 py-2 w-24">Qtd.</th>
                  <th className="text-right font-medium px-3 py-2 w-28">Custo unit.</th>
                  <th className="text-right font-medium px-3 py-2 w-28">Venda unit.</th>
                  <th className="text-right font-medium px-3 py-2 w-28">Venda total</th>
                  <th className="text-center font-medium px-3 py-2 w-24">Estado</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {(capitulo.artigos ?? []).map((art) => {
                  const { status, base } = classifyItem(art, k, comparison.baseItemsByKey);
                  const custoUnit = Number(art.preco_base ?? art.preco_unitario ?? 0);
                  const vendaUnit = Number(art.preco_unitario ?? 0);
                  const vendaTotal = Number(art.valor_total ?? vendaUnit * Number(art.quantidade ?? 0));
                  return (
                    <tr key={art.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{art.codigo ?? "—"}</td>
                      <td className="px-3 py-2 max-w-[420px]">
                        <p className="truncate" title={art.descricao}>{art.descricao}</p>
                        {base && status === "alterado" && (
                          <p className="text-[10px] text-muted-foreground">
                            Base: {base.quantidade} {base.unidade} · {fmtEUR(base.preco_unitario)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{art.unidade}</td>
                      <td className="px-3 py-2 text-right">
                        <InlineNumber
                          value={Number(art.quantidade ?? 0)}
                          readOnly={readOnly}
                          onCommit={(v) => onUpdateQuantidade(art.id, v)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <InlineNumber
                          value={custoUnit}
                          readOnly={readOnly}
                          onCommit={(v) => onUpdateCustoVenda(art.id, { preco_base: v })}
                          prefix="€"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <InlineNumber
                          value={vendaUnit}
                          readOnly={readOnly}
                          onCommit={(v) => onUpdateCustoVenda(art.id, { preco_unitario: v })}
                          prefix="€"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{fmtEUR(vendaTotal)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-[10px] ${statusStyle[status]}`}>
                          {status === "original" ? "Original" : status === "alterado" ? "Alterado" : "Novo"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditArtigo(art)} disabled={readOnly}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar artigo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteArtigo(art.id)}
                              disabled={readOnly}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function InlineNumber({
  value,
  readOnly,
  onCommit,
  prefix,
}: {
  value: number;
  readOnly: boolean;
  onCommit: (v: number) => void;
  prefix?: string;
}) {
  const [local, setLocal] = useState<string>(String(value ?? 0));
  useMemo(() => setLocal(String(value ?? 0)), [value]);

  if (readOnly) {
    return <span>{prefix ? `${prefix} ` : ""}{Number(value ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
  }
  return (
    <input
      type="number"
      step="0.01"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const num = parseFloat(local || "0");
        if (!Number.isNaN(num) && num !== value) onCommit(num);
      }}
      className="w-full rounded-md border border-transparent hover:border-input focus:border-primary focus:outline-none px-2 py-1 text-right bg-transparent"
    />
  );
}
