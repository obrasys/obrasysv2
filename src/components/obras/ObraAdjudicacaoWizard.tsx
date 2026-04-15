import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle, Calendar, Euro, Percent, Plus, Trash2, Loader2, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { useAdjudicacao } from '@/hooks/useAdjudicacao';
import type { AdjudicacaoFormData, Installment } from '@/types/adjudicacao';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

interface ObraOrcamento {
  id: string;
  titulo: string;
  valor_total: number;
  status: string;
  cliente_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraId: string;
  obraNome: string;
  orcamentos: ObraOrcamento[];
}

export function ObraAdjudicacaoWizard({ open, onOpenChange, obraId, obraNome, orcamentos }: Props) {
  const [step, setStep] = useState(1);
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string>('manual');
  const [manualValor, setManualValor] = useState(0);

  const selectedOrc = orcamentos.find(o => o.id === selectedOrcamentoId);
  const valorBase = selectedOrc ? selectedOrc.valor_total : manualValor;

  const { adjudicar } = useAdjudicacao(selectedOrc?.id);

  const [formData, setFormData] = useState<AdjudicacaoFormData>({
    awarded_at: new Date().toISOString().split('T')[0],
    awarded_total_amount: 0,
    deposit_amount: 0,
    deposit_percent: 0,
    notes: '',
    payment_type: 'installments',
    installments: [],
  });

  // Sync valor when source changes
  const syncValor = (valor: number) => {
    setFormData(prev => ({
      ...prev,
      awarded_total_amount: Math.round(valor * 100) / 100,
      deposit_amount: 0,
      deposit_percent: 0,
      installments: [],
    }));
  };

  const remaining = formData.awarded_total_amount - formData.deposit_amount;
  const installmentsTotal = formData.installments.reduce((s, i) => s + i.amount, 0);
  const isInstallmentsValid =
    formData.payment_type === 'single'
      ? true
      : formData.installments.length > 0 && Math.abs(installmentsTotal - remaining) < 0.01;

  const updateDeposit = useCallback((field: 'amount' | 'percent', val: number) => {
    if (field === 'amount') {
      const pct = formData.awarded_total_amount > 0 ? (val / formData.awarded_total_amount) * 100 : 0;
      setFormData(prev => ({ ...prev, deposit_amount: val, deposit_percent: Math.round(pct * 100) / 100 }));
    } else {
      const amt = (val / 100) * formData.awarded_total_amount;
      setFormData(prev => ({ ...prev, deposit_percent: val, deposit_amount: Math.round(amt * 100) / 100 }));
    }
  }, [formData.awarded_total_amount]);

  const addInstallment = () => {
    const remainingForInst = remaining - installmentsTotal;
    const n = formData.installments.length + 1;
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + n);
    setFormData(prev => ({
      ...prev,
      installments: [
        ...prev.installments,
        {
          label: `Parcela ${n}`,
          percent: formData.awarded_total_amount > 0 ? Math.round((remainingForInst / formData.awarded_total_amount) * 10000) / 100 : 0,
          amount: Math.round(remainingForInst * 100) / 100,
          due_date: dueDate.toISOString().split('T')[0],
        },
      ],
    }));
  };

  const removeInstallment = (idx: number) => {
    setFormData(prev => ({ ...prev, installments: prev.installments.filter((_, i) => i !== idx) }));
  };

  const updateInstallment = (idx: number, field: keyof Installment, val: string | number) => {
    setFormData(prev => {
      const updated = [...prev.installments];
      const inst = { ...updated[idx] };
      if (field === 'amount') {
        inst.amount = Number(val);
        inst.percent = formData.awarded_total_amount > 0 ? Math.round((inst.amount / formData.awarded_total_amount) * 10000) / 100 : 0;
      } else if (field === 'percent') {
        inst.percent = Number(val);
        inst.amount = Math.round((inst.percent / 100) * formData.awarded_total_amount * 100) / 100;
      } else {
        (inst as any)[field] = val;
      }
      updated[idx] = inst;
      return { ...prev, installments: updated };
    });
  };

  const handleConfirm = () => {
    const orcamento = selectedOrc
      ? { id: selectedOrc.id, obra_id: obraId, cliente_id: selectedOrc.cliente_id, titulo: selectedOrc.titulo, valor_total: selectedOrc.valor_total }
      : { id: '', obra_id: obraId, cliente_id: null, titulo: obraNome, valor_total: manualValor };

    // For manual (no orcamento), we need a different approach
    if (!selectedOrc) {
      // We'll create a dummy orcamento-like flow — the hook handles obra linking
      // But the hook requires a real budget_id. Let's skip this case for now and only allow selecting existing budgets.
      return;
    }

    adjudicar.mutate({ formData, orcamento }, {
      onSuccess: () => {
        onOpenChange(false);
        setStep(1);
      },
    });
  };

  const nonAdjudicados = orcamentos.filter(o => o.status !== 'adjudicado');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Adjudicar Obra
          </DialogTitle>
          <DialogDescription>Passo {step} de 3 — {step === 1 ? 'Selecionar orçamento' : step === 2 ? 'Sinal e parcelas' : 'Confirmação'}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Select budget and value */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Orçamento de Base</Label>
              {nonAdjudicados.length > 0 ? (
                <Select value={selectedOrcamentoId} onValueChange={v => {
                  setSelectedOrcamentoId(v);
                  const orc = orcamentos.find(o => o.id === v);
                  if (orc) syncValor(orc.valor_total);
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar orçamento" /></SelectTrigger>
                  <SelectContent>
                    {nonAdjudicados.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.titulo} — {formatCurrency(o.valor_total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground p-3 border rounded-md">
                  Nenhum orçamento disponível para adjudicação. Crie um orçamento primeiro.
                </p>
              )}
            </div>

            {selectedOrcamentoId !== 'manual' && (
              <>
                <div>
                  <Label>Valor Adjudicado (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.awarded_total_amount}
                    onChange={e => setFormData(prev => ({ ...prev, awarded_total_amount: +e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Pode ajustar o valor final em relação ao orçamento base.</p>
                </div>
                <div>
                  <Label>Data de Adjudicação</Label>
                  <Input
                    type="date"
                    value={formData.awarded_at}
                    onChange={e => setFormData(prev => ({ ...prev, awarded_at: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    placeholder="Condições especiais, referência do contrato..."
                  />
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedOrc || formData.awarded_total_amount <= 0}
              >
                Seguinte <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Deposit + Installments */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Valor Adjudicado</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(formData.awarded_total_amount)}</span>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Deposit */}
            <div>
              <Label className="flex items-center gap-1"><Euro className="h-3 w-3" /> Sinal / Adiantamento</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Percentagem (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.deposit_percent}
                    onChange={e => updateDeposit('percent', +e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.deposit_amount}
                    onChange={e => updateDeposit('amount', +e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment type */}
            <div>
              <Label>Tipo de Pagamento</Label>
              <Select value={formData.payment_type} onValueChange={v => setFormData(prev => ({ ...prev, payment_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Pagamento Único</SelectItem>
                  <SelectItem value="installments">Parcelas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Installments */}
            {formData.payment_type === 'installments' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Parcelas</Label>
                  <Button variant="outline" size="sm" onClick={addInstallment}>
                    <Plus className="h-3 w-3 mr-1" /> Parcela
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Restante a parcelar: <span className="font-bold">{formatCurrency(remaining)}</span>
                  {formData.installments.length > 0 && (
                    <span className={`ml-2 ${Math.abs(installmentsTotal - remaining) < 0.01 ? 'text-emerald-600' : 'text-destructive'}`}>
                      (alocado: {formatCurrency(installmentsTotal)})
                    </span>
                  )}
                </div>

                {formData.installments.map((inst, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs">Nome</Label>
                        <Input className="h-8 text-xs" value={inst.label} onChange={e => updateInstallment(idx, 'label', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">%</Label>
                        <Input className="h-8 text-xs" type="number" step="0.01" value={inst.percent} onChange={e => updateInstallment(idx, 'percent', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Valor (€)</Label>
                        <Input className="h-8 text-xs" type="number" step="0.01" value={inst.amount} onChange={e => updateInstallment(idx, 'amount', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Vencimento</Label>
                        <Input className="h-8 text-xs" type="date" value={inst.due_date} onChange={e => updateInstallment(idx, 'due_date', e.target.value)} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeInstallment(idx)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button onClick={() => setStep(3)} disabled={formData.payment_type === 'installments' && !isInstallmentsValid}>
                Seguinte <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Orçamento</span>
                  <span className="text-sm font-medium">{selectedOrc?.titulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor Adjudicado</span>
                  <span className="text-sm font-bold">{formatCurrency(formData.awarded_total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sinal ({formData.deposit_percent.toFixed(1)}%)</span>
                  <span className="text-sm">{formatCurrency(formData.deposit_amount)}</span>
                </div>
                <Separator />
                {formData.installments.map((inst, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{inst.label} ({inst.percent.toFixed(1)}%)</span>
                    <span className="text-sm">{formatCurrency(inst.amount)} — {inst.due_date}</span>
                  </div>
                ))}
                {formData.payment_type === 'single' && remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Restante</span>
                    <span className="text-sm font-bold">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button onClick={handleConfirm} disabled={adjudicar.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {adjudicar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Confirmar Adjudicação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
