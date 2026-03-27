import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle, Calendar, Euro, Percent, Plus, Trash2, AlertTriangle, Loader2, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { useAdjudicacao } from '@/hooks/useAdjudicacao';
import type { AdjudicacaoFormData, Installment } from '@/types/adjudicacao';
import type { Orcamento } from '@/types/orcamentos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: Orcamento;
  valorFinal: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

export function AdjudicacaoWizard({ open, onOpenChange, orcamento, valorFinal }: Props) {
  const { adjudicar } = useAdjudicacao(orcamento.id);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<AdjudicacaoFormData>({
    awarded_at: new Date().toISOString().split('T')[0],
    awarded_total_amount: valorFinal,
    deposit_amount: 0,
    deposit_percent: 0,
    notes: '',
    payment_type: 'installments',
    installments: [],
  });

  const remaining = formData.awarded_total_amount - formData.deposit_amount;
  const installmentsTotal = formData.installments.reduce((s, i) => s + i.amount, 0);
  const installmentsPercentTotal = formData.installments.reduce((s, i) => s + i.percent, 0);
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
    const remainingForInstallments = remaining - installmentsTotal;
    const n = formData.installments.length + 1;
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + n);
    setFormData(prev => ({
      ...prev,
      installments: [
        ...prev.installments,
        {
          label: `Parcela ${n}`,
          percent: formData.awarded_total_amount > 0 ? Math.round((remainingForInstallments / formData.awarded_total_amount) * 10000) / 100 : 0,
          amount: Math.round(remainingForInstallments * 100) / 100,
          due_date: dueDate.toISOString().split('T')[0],
        },
      ],
    }));
  };

  const removeInstallment = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== idx),
    }));
  };

  const updateInstallment = (idx: number, field: keyof Installment, val: string | number) => {
    setFormData(prev => {
      const updated = [...prev.installments];
      const inst = { ...updated[idx] };

      if (field === 'amount') {
        inst.amount = Number(val);
        inst.percent = formData.awarded_total_amount > 0
          ? Math.round((inst.amount / formData.awarded_total_amount) * 10000) / 100 : 0;
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

  const distributeEqually = () => {
    const n = formData.installments.length;
    if (n === 0) return;
    const eachAmount = Math.round((remaining / n) * 100) / 100;
    const eachPercent = formData.awarded_total_amount > 0
      ? Math.round((eachAmount / formData.awarded_total_amount) * 10000) / 100 : 0;

    setFormData(prev => ({
      ...prev,
      installments: prev.installments.map((inst, idx) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + idx + 1);
        return {
          ...inst,
          amount: idx === n - 1 ? Math.round((remaining - eachAmount * (n - 1)) * 100) / 100 : eachAmount,
          percent: eachPercent,
          due_date: inst.due_date || dueDate.toISOString().split('T')[0],
        };
      }),
    }));
  };

  const handleSinglePayment = () => {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    setFormData(prev => ({
      ...prev,
      payment_type: 'single',
      installments: [{
        label: 'Pagamento único',
        percent: formData.awarded_total_amount > 0 ? Math.round((remaining / formData.awarded_total_amount) * 10000) / 100 : 100,
        amount: remaining,
        due_date: dueDate.toISOString().split('T')[0],
      }],
    }));
  };

  const handleSubmit = async () => {
    await adjudicar.mutateAsync({
      formData,
      orcamento: {
        id: orcamento.id,
        obra_id: orcamento.obra_id || null,
        cliente_id: orcamento.cliente_id,
        titulo: orcamento.titulo,
        valor_total: orcamento.valor_total,
      },
    });
    onOpenChange(false);
  };

  const canProceedStep1 = formData.awarded_total_amount > 0 && formData.deposit_amount >= 0 && formData.deposit_amount <= formData.awarded_total_amount;
  const canProceedStep2 = isInstallmentsValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Adjudicar Orçamento
          </DialogTitle>
          <DialogDescription>
            {orcamento.titulo} — {orcamento.codigo}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              <span className={`text-xs hidden sm:inline ${s <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Dados' : s === 2 ? 'Pagamento' : 'Confirmação'}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 - Award Data */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Data da Adjudicação</Label>
                <Input
                  type="date"
                  value={formData.awarded_at}
                  onChange={e => setFormData(prev => ({ ...prev, awarded_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Euro className="h-3.5 w-3.5" /> Valor Adjudicado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.awarded_total_amount}
                  onChange={e => setFormData(prev => ({ ...prev, awarded_total_amount: Number(e.target.value) }))}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Euro className="h-3.5 w-3.5" /> Valor já pago (sinal)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount || ''}
                  onChange={e => updateDeposit('amount', Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Percentagem paga</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={100}
                  value={formData.deposit_percent || ''}
                  onChange={e => updateDeposit('percent', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor adjudicado</span>
                  <span className="font-semibold">{formatCurrency(formData.awarded_total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sinal ({formData.deposit_percent}%)</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(formData.deposit_amount)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm font-bold">
                  <span>Remanescente</span>
                  <span className="text-primary">{formatCurrency(remaining)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Notas / Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionais sobre a adjudicação..."
                rows={2}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Seguinte <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 - Payment Plan */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Plano de Pagamento</h3>
                <p className="text-xs text-muted-foreground">Remanescente: {formatCurrency(remaining)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSinglePayment}>
                  Pagamento único
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setFormData(prev => ({ ...prev, payment_type: 'installments', installments: [] }));
                }}>
                  Parcelas manuais
                </Button>
              </div>
            </div>

            {formData.payment_type === 'installments' && (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addInstallment}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar parcela
                  </Button>
                  {formData.installments.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={distributeEqually}>
                      Distribuir igualmente
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {formData.installments.map((inst, idx) => (
                    <Card key={idx} className="border">
                      <CardContent className="py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">Parcela {idx + 1}</Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeInstallment(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={inst.label}
                              onChange={e => updateInstallment(idx, 'label', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">% do total</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={inst.percent || ''}
                              onChange={e => updateInstallment(idx, 'percent', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Valor (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={inst.amount || ''}
                              onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Vencimento</Label>
                            <Input
                              type="date"
                              value={inst.due_date}
                              onChange={e => updateInstallment(idx, 'due_date', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {formData.payment_type === 'single' && formData.installments.length > 0 && (
              <Card className="border">
                <CardContent className="py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor</Label>
                      <p className="text-sm font-semibold">{formatCurrency(formData.installments[0].amount)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vencimento</Label>
                      <Input
                        type="date"
                        value={formData.installments[0].due_date}
                        onChange={e => updateInstallment(0, 'due_date', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Validation */}
            {formData.installments.length > 0 && Math.abs(installmentsTotal - remaining) > 0.01 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Soma das parcelas ({formatCurrency(installmentsTotal)}) difere do remanescente ({formatCurrency(remaining)}).
                  Diferença: {formatCurrency(Math.abs(installmentsTotal - remaining))}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Anterior
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Seguinte <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 - Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardContent className="py-4 space-y-3">
                <h3 className="text-sm font-semibold">Resumo da Adjudicação</h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Orçamento</span>
                    <span className="font-medium">{orcamento.titulo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data adjudicação</span>
                    <span>{formData.awarded_at}</span>
                  </div>
                  {orcamento.cliente && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente</span>
                      <span>{orcamento.cliente.nome}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total adjudicado</span>
                    <span>{formatCurrency(formData.awarded_total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sinal pago ({formData.deposit_percent}%)</span>
                    <span className="text-emerald-600 font-medium">{formatCurrency(formData.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-primary">
                    <span>Saldo remanescente</span>
                    <span>{formatCurrency(remaining)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Plano de Pagamento ({formData.installments.length} parcela{formData.installments.length !== 1 ? 's' : ''})
                  </h4>
                  {formData.installments.map((inst, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{inst.label} — {inst.due_date}</span>
                      <span className="font-medium">{formatCurrency(inst.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-medium text-foreground">Ao confirmar, o sistema irá:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Alterar o estado do orçamento para <strong>Adjudicado</strong></li>
                  {!orcamento.obra_id && <li>Criar uma nova obra automaticamente</li>}
                  <li>Criar {formData.installments.length + (formData.deposit_amount > 0 ? 1 : 0)} conta(s) a receber no financeiro</li>
                  <li>Agendar alertas 5 dias antes do vencimento de cada parcela</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Anterior
              </Button>
              <Button onClick={handleSubmit} disabled={adjudicar.isPending} className="bg-primary">
                {adjudicar.isPending ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> A processar...</>
                ) : (
                  <><CheckCircle className="mr-1.5 h-4 w-4" /> Confirmar Adjudicação</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
