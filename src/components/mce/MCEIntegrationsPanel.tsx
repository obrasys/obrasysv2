import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Gavel, FileSignature, TrendingUp, Sparkles, AlertTriangle, Info, AlertCircle, Loader2,
} from 'lucide-react';
import {
  useMCEContract, useMCEFinancial, useMCEBudgetUpdates,
  useAwardMCE, useUpdateMCEFinancial, useApplyMCEToBudgetObjetivo,
  useAxiaAnalyzeMCE,
} from '@/hooks/useMCEIntegrations';
import type { MceMap, MceSupplier } from '@/types/mce';

interface Props {
  map: MceMap;
  suppliers: MceSupplier[];
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

export function MCEIntegrationsPanel({ map, suppliers }: Props) {
  const contractQ = useMCEContract(map.id);
  const finQ = useMCEFinancial(map.id);
  const updatesQ = useMCEBudgetUpdates(map.id);
  const award = useAwardMCE();
  const updFin = useUpdateMCEFinancial();
  const applyBO = useApplyMCEToBudgetObjetivo();
  const axia = useAxiaAnalyzeMCE();

  const selected = suppliers.find((s) => s.is_selected);
  const canAward = !!selected && map.status !== 'adjudicado' && map.status !== 'fechado';

  // award dialog
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardValue, setAwardValue] = useState<number>(selected?.proposal_total ?? 0);
  const [contractNumber, setContractNumber] = useState('');
  const [signedAt, setSignedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [awardNotes, setAwardNotes] = useState('');

  // budget objetivo dialog
  const [boOpen, setBoOpen] = useState(false);
  const [boValue, setBoValue] = useState<number>(map.awarded_value || selected?.proposal_total || 0);
  const [boJust, setBoJust] = useState('');

  // financeiro inline
  const [exec, setExec] = useState<number | ''>('');
  const [inv, setInv] = useState<number | ''>('');
  const [pay, setPay] = useState<number | ''>('');

  const alerts = (map.axia_alerts as unknown as Array<{ level: 'info'|'warning'|'critical'; message: string }>) ?? [];

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" />
          Integrações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contrato">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="contrato"><Gavel className="h-3 w-3 mr-1" />Contrato</TabsTrigger>
            <TabsTrigger value="financeiro"><TrendingUp className="h-3 w-3 mr-1" />Financeiro</TabsTrigger>
            <TabsTrigger value="budget">Budget Obj.</TabsTrigger>
            <TabsTrigger value="axia"><Sparkles className="h-3 w-3 mr-1" />Axia</TabsTrigger>
          </TabsList>

          {/* CONTRATO / ADJUDICAÇÃO */}
          <TabsContent value="contrato" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="text-muted-foreground text-xs">Fornecedor selecionado</div>
                <div className="font-semibold">{selected?.supplier_name_snapshot ?? '—'}</div>
                <div className="text-xs">Proposta: {fmtEUR(selected?.proposal_total ?? 0)}</div>
              </div>
              <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!canAward} size="sm">
                    <Gavel className="h-3 w-3 mr-1" />
                    {map.status === 'adjudicado' ? 'Já adjudicado' : 'Adjudicar'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adjudicar MCE</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Valor adjudicado (€)</Label>
                      <Input type="number" step="0.01" value={awardValue} onChange={(e) => setAwardValue(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Nº Contrato</Label>
                        <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data</Label>
                        <Input type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Notas</Label>
                      <Textarea value={awardNotes} onChange={(e) => setAwardNotes(e.target.value)} rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAwardOpen(false)}>Cancelar</Button>
                    <Button
                      disabled={award.isPending || awardValue <= 0}
                      onClick={async () => {
                        await award.mutateAsync({
                          mce_id: map.id,
                          awarded_value: awardValue,
                          contract_number: contractNumber || undefined,
                          signed_at: signedAt || undefined,
                          notes: awardNotes || undefined,
                        });
                        setAwardOpen(false);
                      }}
                    >
                      {award.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Confirmar adjudicação
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Contratos / Adjudicações</div>
              {contractQ.data?.length ? contractQ.data.map((c) => (
                <div key={c.id} className="border rounded-lg p-2 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-medium">{c.contract_number ?? '(sem nº)'} — {c.supplier_name_snapshot}</div>
                    <div className="text-muted-foreground">{c.signed_at ?? '—'} · {c.contract_type}</div>
                  </div>
                  <div className="font-semibold">{fmtEUR(Number(c.value))}</div>
                </div>
              )) : <div className="text-xs text-muted-foreground">Sem contrato registado.</div>}
            </div>
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-3 pt-3">
            {finQ.data ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Kpi label="Adjudicado" value={fmtEUR(Number(finQ.data.awarded_value))} />
                  <Kpi label="Executado" value={fmtEUR(Number(finQ.data.executed_value))} />
                  <Kpi label={`Faturado (${Number(finQ.data.invoiced_pct).toFixed(1)}%)`} value={fmtEUR(Number(finQ.data.invoiced_value))} />
                  <Kpi label={`Liquidado (${Number(finQ.data.paid_pct).toFixed(1)}%)`} value={fmtEUR(Number(finQ.data.paid_value))} />
                </div>
                <div className="text-xs text-muted-foreground">Por pagar: <strong>{fmtEUR(Number(finQ.data.pending_value))}</strong></div>
                <Separator />
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Novo executado</Label><Input type="number" step="0.01" value={exec} onChange={(e) => setExec(e.target.value === '' ? '' : parseFloat(e.target.value))} /></div>
                  <div><Label className="text-[10px]">Novo faturado</Label><Input type="number" step="0.01" value={inv} onChange={(e) => setInv(e.target.value === '' ? '' : parseFloat(e.target.value))} /></div>
                  <div><Label className="text-[10px]">Novo liquidado</Label><Input type="number" step="0.01" value={pay} onChange={(e) => setPay(e.target.value === '' ? '' : parseFloat(e.target.value))} /></div>
                </div>
                <Button
                  size="sm"
                  disabled={updFin.isPending}
                  onClick={async () => {
                    await updFin.mutateAsync({
                      mce_id: map.id,
                      executed_value: exec === '' ? undefined : Number(exec),
                      invoiced_value: inv === '' ? undefined : Number(inv),
                      paid_value: pay === '' ? undefined : Number(pay),
                    });
                    setExec(''); setInv(''); setPay('');
                  }}
                >
                  Atualizar
                </Button>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Controlo financeiro é criado automaticamente ao adjudicar.</div>
            )}
          </TabsContent>

          {/* BUDGET OBJETIVO */}
          <TabsContent value="budget" className="space-y-3 pt-3">
            <div className="text-xs text-muted-foreground">
              Aplica o valor adjudicado ao Budget Objetivo. Não altera o Orçamento Base Seco (€{Number(map.dry_budget_total).toFixed(2)}).
            </div>
            <Dialog open={boOpen} onOpenChange={setBoOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">Aplicar ao Budget Objetivo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Aplicar ao Budget Objetivo</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Novo valor objetivo (€)</Label>
                    <Input type="number" step="0.01" value={boValue} onChange={(e) => setBoValue(parseFloat(e.target.value) || 0)} />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Desvio: {fmtEUR(boValue - Number(map.dry_budget_total))}
                      {Number(map.dry_budget_total) > 0 && ` (${(((boValue - Number(map.dry_budget_total)) / Number(map.dry_budget_total)) * 100).toFixed(2)}%)`}
                    </div>
                  </div>
                  <div>
                    <Label>Justificação (obrigatória)</Label>
                    <Textarea value={boJust} onChange={(e) => setBoJust(e.target.value)} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBoOpen(false)}>Cancelar</Button>
                  <Button
                    disabled={applyBO.isPending || boJust.trim().length < 5}
                    onClick={async () => {
                      await applyBO.mutateAsync({ mce_id: map.id, new_value: boValue, justification: boJust });
                      setBoOpen(false); setBoJust('');
                    }}
                  >
                    {applyBO.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Aplicar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Separator />
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Histórico</div>
              {updatesQ.data?.length ? updatesQ.data.map((u) => (
                <div key={u.id} className="border rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span>{new Date(u.applied_at).toLocaleString('pt-PT')} · {u.applied_by_name ?? '—'}</span>
                    <span className={u.deviation_value >= 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {fmtEUR(u.deviation_value)} ({Number(u.deviation_pct).toFixed(2)}%)
                    </span>
                  </div>
                  <div className="text-muted-foreground">{fmtEUR(u.previous_value)} → {fmtEUR(u.new_value)}</div>
                  <div className="italic mt-1">"{u.justification}"</div>
                </div>
              )) : <div className="text-xs text-muted-foreground">Sem atualizações.</div>}
            </div>
          </TabsContent>

          {/* AXIA */}
          <TabsContent value="axia" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Análise contextual da Axia sobre o MCE.</div>
              <Button size="sm" onClick={() => axia.mutate(map.id)} disabled={axia.isPending}>
                {axia.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Analisar
              </Button>
            </div>

            {map.axia_summary && (
              <div className="border rounded-lg p-3 bg-primary/5 text-xs">
                <div className="font-medium mb-1 text-primary">Resumo</div>
                <p>{map.axia_summary}</p>
              </div>
            )}

            <div className="space-y-2">
              {alerts.length === 0 && <div className="text-xs text-muted-foreground">Sem alertas. Corre uma análise.</div>}
              {alerts.map((a, i) => (
                <div key={i} className="flex gap-2 text-xs border rounded p-2">
                  {a.level === 'critical' ? <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    : a.level === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    : <Info className="h-4 w-4 text-blue-500 shrink-0" />}
                  <span>{a.message}</span>
                  <Badge variant="outline" className="ml-auto text-[9px]">{a.level}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
