import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronRight, ScanSearch, AlertTriangle, CheckCircle2, Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Orcamento } from '@/types/orcamentos';

interface Props {
  orcamento: Orcamento;
  margemDecimal: number;
  taxaIVA: number;
  custosIndiretosTotal: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);

const EPSILON = 0.01;

export function OrcamentoAuditPanel({
  orcamento,
  margemDecimal,
  taxaIVA,
  custosIndiretosTotal,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const applyM = (v: number) =>
    margemDecimal > 0 && margemDecimal < 1 ? v / (1 - margemDecimal) : v;

  const audit = useMemo(() => {
    const chapters = (orcamento.capitulos || []).map((cap) => {
      const artigos = cap.artigos || [];
      const capRaw = artigos.reduce(
        (acc, a) => acc + (a.valor_total ?? a.quantidade * a.preco_unitario),
        0
      );
      const capStored = cap.valor_total || 0;
      const capWithMargin = applyM(capRaw);
      const drift = Math.abs(capRaw - capStored);
      return {
        id: cap.id,
        numero: cap.numero,
        titulo: cap.titulo,
        artigos,
        capRaw,
        capStored,
        capWithMargin,
        drift,
        hasDrift: drift > EPSILON,
      };
    });

    const subtotalArtigosLive = chapters.reduce((s, c) => s + c.capRaw, 0);
    const subtotalArtigosStored = orcamento.valor_total || 0;
    const subtotalDrift = Math.abs(subtotalArtigosLive - subtotalArtigosStored);

    const subtotalComIndiretos = subtotalArtigosLive + custosIndiretosTotal;
    const valorBase = applyM(subtotalComIndiretos);
    const valorIVA = valorBase * (taxaIVA / 100);
    const valorFinal = valorBase + valorIVA;
    const lucroEstimado = valorBase - subtotalComIndiretos;

    const totalDriftDetected =
      subtotalDrift > EPSILON || chapters.some((c) => c.hasDrift);

    return {
      chapters,
      subtotalArtigosLive,
      subtotalArtigosStored,
      subtotalDrift,
      subtotalHasDrift: subtotalDrift > EPSILON,
      custosIndiretosTotal,
      subtotalComIndiretos,
      valorBase,
      valorIVA,
      valorFinal,
      lucroEstimado,
      totalDriftDetected,
    };
  }, [orcamento, margemDecimal, taxaIVA, custosIndiretosTotal]);

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyReport = async () => {
    const lines: string[] = [];
    lines.push(`AUDITORIA — ${orcamento.titulo} (${orcamento.codigo || 'sem código'})`);
    lines.push(`Margem aplicada: ${(margemDecimal * 100).toFixed(2)}%   |   IVA: ${taxaIVA}%`);
    lines.push('');
    audit.chapters.forEach((c) => {
      lines.push(`Cap. ${c.numero} — ${c.titulo}`);
      lines.push(`  capRaw (∑ artigos)        : ${fmt(c.capRaw)}`);
      lines.push(`  capStored (BD)            : ${fmt(c.capStored)}`);
      if (c.hasDrift) lines.push(`  ⚠ DIVERGÊNCIA            : ${fmt(c.drift)}`);
      lines.push(`  capRaw c/ margem aplicada : ${fmt(c.capWithMargin)}`);
      lines.push('');
    });
    lines.push('— Resumo —');
    lines.push(`Subtotal artigos (live)   : ${fmt(audit.subtotalArtigosLive)}`);
    lines.push(`Subtotal artigos (BD)     : ${fmt(audit.subtotalArtigosStored)}`);
    if (audit.subtotalHasDrift) lines.push(`⚠ DIVERGÊNCIA            : ${fmt(audit.subtotalDrift)}`);
    lines.push(`Custos indiretos          : ${fmt(audit.custosIndiretosTotal)}`);
    lines.push(`Subtotal c/ indiretos     : ${fmt(audit.subtotalComIndiretos)}`);
    lines.push(`Valor base (c/ margem)    : ${fmt(audit.valorBase)}`);
    lines.push(`IVA (${taxaIVA}%)              : ${fmt(audit.valorIVA)}`);
    lines.push(`TOTAL                     : ${fmt(audit.valorFinal)}`);
    lines.push(`Lucro estimado            : ${fmt(audit.lucroEstimado)}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast({ title: 'Relatório copiado', description: 'Cole no email/ticket para análise.' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-amber-300/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-amber-600" />
                Auditoria do Orçamento
                {audit.totalDriftDetected ? (
                  <Badge variant="destructive" className="ml-1">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Divergências
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Coerente
                  </Badge>
                )}
              </CardTitle>
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Intro / parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Margem aplicada</p>
                <p className="font-mono font-medium">{(margemDecimal * 100).toFixed(2)}%</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Multiplicador</p>
                <p className="font-mono font-medium">
                  {margemDecimal > 0 && margemDecimal < 1 ? (1 / (1 - margemDecimal)).toFixed(4) : '1.0000'}×
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Taxa IVA</p>
                <p className="font-mono font-medium">{taxaIVA}%</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Custos indiretos</p>
                <p className="font-mono font-medium">{fmt(custosIndiretosTotal)}</p>
              </div>
            </div>

            {/* Per-chapter breakdown */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Cap.</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">capRaw (∑ artigos)</TableHead>
                    <TableHead className="text-right">capStored (BD)</TableHead>
                    <TableHead className="text-right">c/ margem</TableHead>
                    <TableHead className="text-center w-20">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.chapters.map((c) => {
                    const isOpenRow = openChapters.has(c.id);
                    return (
                      <>
                        <TableRow
                          key={c.id}
                          className={c.hasDrift ? 'bg-destructive/5' : undefined}
                        >
                          <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                          <TableCell className="text-sm">
                            <button
                              type="button"
                              onClick={() => toggleChapter(c.id)}
                              className="flex items-center gap-1 hover:underline"
                            >
                              {isOpenRow ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              {c.titulo}
                            </button>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(c.capRaw)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(c.capStored)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">{fmt(c.capWithMargin)}</TableCell>
                          <TableCell className="text-center">
                            {c.hasDrift ? (
                              <Badge variant="destructive" className="text-[10px]">Δ {fmt(c.drift)}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        {isOpenRow && c.artigos.length > 0 && (
                          <TableRow key={`${c.id}-detail`}>
                            <TableCell />
                            <TableCell colSpan={5} className="bg-muted/30">
                              <div className="text-[11px] space-y-1 py-1">
                                {c.artigos.map((a) => {
                                  const linhaRaw = a.valor_total ?? a.quantidade * a.preco_unitario;
                                  const linhaMargem = applyM(linhaRaw);
                                  return (
                                    <div key={a.id} className="flex justify-between font-mono">
                                      <span className="truncate max-w-[60%]">
                                        {a.codigo ? `${a.codigo} · ` : ''}{a.descricao}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {a.quantidade} {a.unidade} × {fmt(a.preco_unitario)} = {fmt(linhaRaw)}
                                        {margemDecimal > 0 && margemDecimal < 1 && (
                                          <> → <span className="text-foreground">{fmt(linhaMargem)}</span></>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Cadeia de cálculo do total */}
            <div className="space-y-1 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Cadeia de cálculo</p>
              <div className="flex justify-between font-mono text-xs">
                <span>Subtotal artigos (live = ∑ capRaw)</span>
                <span>{fmt(audit.subtotalArtigosLive)}</span>
              </div>
              <div className={`flex justify-between font-mono text-xs ${audit.subtotalHasDrift ? 'text-destructive' : 'text-muted-foreground'}`}>
                <span>Subtotal artigos (orcamento.valor_total na BD)</span>
                <span>
                  {fmt(audit.subtotalArtigosStored)}
                  {audit.subtotalHasDrift && <> ⚠ Δ {fmt(audit.subtotalDrift)}</>}
                </span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span>+ Custos indiretos</span>
                <span>{fmt(audit.custosIndiretosTotal)}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span>= Subtotal c/ indiretos</span>
                <span>{fmt(audit.subtotalComIndiretos)}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span>× margem ({(margemDecimal * 100).toFixed(2)}%) → Valor base (s/ IVA)</span>
                <span className="font-medium">{fmt(audit.valorBase)}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span>+ IVA ({taxaIVA}%)</span>
                <span>{fmt(audit.valorIVA)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-mono text-sm font-bold">
                <span>= TOTAL FINAL</span>
                <span className="text-primary">{fmt(audit.valorFinal)}</span>
              </div>
              <div className="flex justify-between font-mono text-xs text-muted-foreground">
                <span>Lucro estimado (valorBase − custo)</span>
                <span>{fmt(audit.lucroEstimado)}</span>
              </div>
            </div>

            {/* Drift hint */}
            {audit.totalDriftDetected && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <p className="font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Divergências detectadas entre valores armazenados e cálculo ao vivo.
                </p>
                <p className="mt-1 text-destructive/80">
                  O ecrã e o PDF usam o valor live (∑ artigos). Edite e guarde qualquer artigo do capítulo para
                  forçar o trigger a sincronizar a base de dados.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={copyReport}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar relatório
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
