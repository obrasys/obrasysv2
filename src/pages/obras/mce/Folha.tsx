import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Check, Loader2, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useMCEDetail, useUpdateMCEMap, useUpdateMCESupplier,
  useAddMCESupplier, useRemoveMCESupplier,
  useAddMCEItem, useUpdateMCEItem, useRemoveMCEItem, useUpsertMCEPrice,
} from '@/hooks/useMCE';
import {
  MCE_CATEGORY_LABELS, MCE_STATUS_LABELS,
  type MceCategory, type MceMap, type MceSupplier, type MceItem,
} from '@/types/mce';
import { cn } from '@/lib/utils';

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtPct = (n: number) => {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'percent', minimumFractionDigits: 2 }).format(n);
};

function PriceCell({
  defaultValue,
  onSave,
}: {
  defaultValue: number;
  onSave: (v: number) => void;
}) {
  return (
    <Input
      type="number"
      step="0.01"
      className="h-8 text-right text-xs"
      defaultValue={defaultValue || ''}
      onBlur={(e) => {
        const v = parseFloat(e.target.value) || 0;
        if (v !== defaultValue) onSave(v);
      }}
    />
  );
}

export default function MCEFolha() {
  const { id: obraId, mceId } = useParams<{ id: string; mceId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMCEDetail(mceId);

  const updMap = useUpdateMCEMap();
  const updSup = useUpdateMCESupplier();
  const addSup = useAddMCESupplier();
  const rmSup = useRemoveMCESupplier();
  const addItem = useAddMCEItem();
  const updItem = useUpdateMCEItem();
  const rmItem = useRemoveMCEItem();
  const upsertPrice = useUpsertMCEPrice();

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    data?.prices.forEach((p) => m.set(`${p.mce_item_id}|${p.mce_supplier_id}`, p.unit_price));
    return m;
  }, [data?.prices]);

  const supplierTotals = useMemo(() => {
    const m = new Map<string, number>();
    data?.suppliers.forEach((s) => m.set(s.id, s.proposal_total));
    return m;
  }, [data?.suppliers]);

  const lowestTotal = useMemo(() => {
    const vals = (data?.suppliers ?? [])
      .map((s) => s.proposal_total)
      .filter((v) => v > 0);
    return vals.length ? Math.min(...vals) : 0;
  }, [data?.suppliers]);

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { map, suppliers, items } = data;

  const patchMap = (patch: Partial<MceMap>) =>
    updMap.mutate({ id: map.id, patch });

  const patchSup = (id: string, patch: Partial<MceSupplier>) =>
    updSup.mutate({ id, mce_id: map.id, patch });

  const patchItem = (id: string, patch: Partial<MceItem>) =>
    updItem.mutate({ id, mce_id: map.id, patch });

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-[1700px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Badge variant="outline">{MCE_STATUS_LABELS[map.status]}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Mod. 03-1 — Mapa Comparativo Económico
        </div>
      </div>

      {/* Cabeçalho tipo Excel */}
      <Card className="rounded-xl overflow-hidden border-primary/20">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 border-b bg-primary/5">
            <div className="col-span-2 p-3 border-r flex items-center justify-center">
              <div className="text-center">
                <div className="font-bold text-primary text-lg">MCE</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Mapa Comparativo Económico
                </div>
              </div>
            </div>
            <div className="col-span-7 p-2 grid grid-cols-6 gap-2 border-r">
              <HeaderField label="Nº Obra" defaultValue={map.work_number ?? ''} onSave={(v) => patchMap({ work_number: v })} />
              <HeaderField label="Lote da Obra" defaultValue={map.work_lot ?? ''} onSave={(v) => patchMap({ work_lot: v })} />
              <HeaderField label="Gestor Projeto" defaultValue={map.project_manager_name ?? ''} onSave={(v) => patchMap({ project_manager_name: v })} colSpan={2} />
              <HeaderField label="Nº MCE" defaultValue={map.mce_number ?? ''} onSave={(v) => patchMap({ mce_number: v })} />
              <HeaderField label="Título" defaultValue={map.title} onSave={(v) => patchMap({ title: v })} />
              <HeaderField label="Nome da Obra" defaultValue={map.work_name ?? ''} onSave={(v) => patchMap({ work_name: v })} colSpan={3} />
              <HeaderField label="Local da Obra" defaultValue={map.work_location ?? ''} onSave={(v) => patchMap({ work_location: v })} colSpan={3} />
              <HeaderField label="Referência Contratual" defaultValue={map.contractual_reference ?? ''} onSave={(v) => patchMap({ contractual_reference: v })} colSpan={4} />
              <div className="col-span-2">
                <label className="text-[10px] uppercase text-muted-foreground">Categoria</label>
                <Select
                  value={map.category ?? ''}
                  onValueChange={(v) => patchMap({ category: v as MceCategory })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MCE_CATEGORY_LABELS) as MceCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>{MCE_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-3 p-2 grid grid-cols-3 gap-2">
              <DateField label="Fornecimento" value={map.date_fornecimento} onSave={(v) => patchMap({ date_fornecimento: v })} />
              <DateField label="Contrato" value={map.date_contrato} onSave={(v) => patchMap({ date_contrato: v })} />
              <DateField label="Comparativo" value={map.date_comparativo} onSave={(v) => patchMap({ date_comparativo: v })} />
            </div>
          </div>
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/30 border-b">
            <strong>REFERÊNCIA CONTRATUAL:</strong> [SUB - Subempreitadas] · [SRV - Prestação Serviços] · [MAT - Fornecimentos] · [M.O. - Mão de Obra] · [INS - Instalações Especiais] · [ALU - Equipamentos/Alugueres]
          </div>
        </CardContent>
      </Card>

      {/* Bloco Fornecedores */}
      <Card className="rounded-xl">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-primary/10 text-primary">
              <tr>
                <th className="p-2 text-left w-32" colSpan={2}>FORNECEDORES / SUBEMPREITEIROS</th>
                {suppliers.map((s) => (
                  <th key={s.id} className="p-2 border-l" colSpan={2}>
                    <div className="flex items-center justify-between gap-1">
                      <Input
                        defaultValue={s.supplier_name_snapshot ?? ''}
                        className="h-7 text-xs font-semibold"
                        onBlur={(e) => {
                          if (e.target.value !== s.supplier_name_snapshot)
                            patchSup(s.id, { supplier_name_snapshot: e.target.value });
                        }}
                      />
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6"
                        title={s.is_selected ? 'Selecionado' : 'Marcar como selecionado'}
                        onClick={() => patchSup(s.id, { is_selected: !s.is_selected })}
                      >
                        <Star className={cn('h-3.5 w-3.5', s.is_selected && 'fill-amber-400 text-amber-500')} />
                      </Button>
                      {suppliers.length > 1 && (
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={() => {
                            if (confirm('Remover fornecedor?')) rmSup.mutate({ id: s.id, mce_id: map.id });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2 border-l bg-muted/40" colSpan={3}>
                  <div className="flex items-center justify-between">
                    Orçamento SECO
                    <Button
                      size="sm" variant="outline" className="h-7"
                      onClick={() => addSup.mutate({ mce_id: map.id, position: suppliers.length })}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Fornecedor
                    </Button>
                  </div>
                </th>
              </tr>
              <SupplierRow label="Pessoa Contacto" suppliers={suppliers} field="contact_person" patch={patchSup} />
              <SupplierRow label="Telemóvel" suppliers={suppliers} field="phone" patch={patchSup} />
              <SupplierRow label="Email" suppliers={suppliers} field="email" patch={patchSup} />
            </thead>

            {/* Tabela comparativa */}
            <thead className="bg-primary/15 text-primary">
              <tr>
                <th className="p-2 w-20 text-left">QUANT.</th>
                <th className="p-2 w-16 text-left">UN</th>
                {suppliers.map((s) => (
                  <th key={`h-${s.id}`} className="p-2 border-l" colSpan={2}>
                    <div className="flex justify-around text-[10px]">
                      <span>P. UNIT.</span><span>TOTAL</span>
                    </div>
                  </th>
                ))}
                <th className="p-2 border-l bg-muted/40 text-center">QUANT.</th>
                <th className="p-2 bg-muted/40 text-center">P. UNIT.</th>
                <th className="p-2 bg-muted/40 text-center">TOTAL s/IVA</th>
              </tr>
              <tr>
                <th colSpan={2} className="p-2 text-left bg-primary/5">ESPECIFICAÇÃO</th>
                {suppliers.map((s) => (
                  <th key={`sp-${s.id}`} colSpan={2} className="p-1 border-l" />
                ))}
                <th colSpan={3} className="border-l bg-muted/30" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                return (
                  <tr key={it.id} className={cn('border-t', it.excluded && 'opacity-40 line-through')}>
                    <td className="p-1 align-top" colSpan={2}>
                      <div className="flex gap-1">
                        <Input
                          type="number" step="0.01"
                          defaultValue={it.quantity || ''}
                          className="h-8 w-20 text-xs"
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            if (v !== it.quantity) patchItem(it.id, { quantity: v });
                          }}
                        />
                        <Input
                          defaultValue={it.unit ?? ''}
                          className="h-8 w-16 text-xs"
                          onBlur={(e) => { if (e.target.value !== it.unit) patchItem(it.id, { unit: e.target.value }); }}
                        />
                      </div>
                      <Textarea
                        defaultValue={it.specification ?? ''}
                        className="text-xs min-h-[2.2rem] mt-1"
                        rows={1}
                        onBlur={(e) => { if (e.target.value !== it.specification) patchItem(it.id, { specification: e.target.value }); }}
                      />
                    </td>
                    {suppliers.map((s) => {
                      const up = priceMap.get(`${it.id}|${s.id}`) ?? 0;
                      const total = up * it.quantity;
                      const isLowest = total > 0 && total === Math.min(
                        ...suppliers.map((ss) => (priceMap.get(`${it.id}|${ss.id}`) ?? 0) * it.quantity).filter((v) => v > 0)
                      );
                      return (
                        <td key={`c-${s.id}-${it.id}`} className="border-l p-1" colSpan={2}>
                          <div className="grid grid-cols-2 gap-1">
                            <PriceCell
                              defaultValue={up}
                              onSave={(v) => upsertPrice.mutate({
                                mce_id: map.id, mce_item_id: it.id, mce_supplier_id: s.id, unit_price: v,
                              })}
                            />
                            <div className={cn(
                              'h-8 px-2 flex items-center justify-end text-xs rounded',
                              isLowest ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'bg-muted/30',
                            )}>
                              {fmtEUR(total)}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="border-l p-1 bg-muted/20">
                      <Input
                        type="number" step="0.01"
                        defaultValue={it.dry_budget_quantity || ''}
                        className="h-8 text-xs text-right"
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v !== it.dry_budget_quantity) patchItem(it.id, { dry_budget_quantity: v });
                        }}
                      />
                    </td>
                    <td className="p-1 bg-muted/20">
                      <Input
                        type="number" step="0.01"
                        defaultValue={it.dry_budget_unit_price || ''}
                        className="h-8 text-xs text-right"
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v !== it.dry_budget_unit_price) patchItem(it.id, { dry_budget_unit_price: v });
                        }}
                      />
                    </td>
                    <td className="p-1 bg-muted/30 text-right text-xs font-medium">
                      {fmtEUR(it.dry_budget_total)}
                      <div className="flex justify-end gap-1 mt-1">
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6"
                          title={it.excluded ? 'Reincluir' : 'Excluir'}
                          onClick={() => patchItem(it.id, { excluded: !it.excluded })}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={() => { if (confirm('Eliminar linha?')) rmItem.mutate({ id: it.id, mce_id: map.id }); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={2 + suppliers.length * 2 + 3} className="p-2">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => addItem.mutate({ mce_id: map.id, sort_order: items.length })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar linha
                  </Button>
                </td>
              </tr>
            </tbody>

            {/* Totais */}
            <tfoot className="bg-primary/10 font-semibold text-xs">
              <tr className="border-t-2 border-primary/30">
                <td colSpan={2} className="p-2">
                  <div>ORÇAMENTO ENTREGUE:</div>
                  <div className="text-base text-primary">{fmtEUR(lowestTotal)}</div>
                </td>
                {suppliers.map((s) => {
                  const t = supplierTotals.get(s.id) ?? 0;
                  const isLow = t > 0 && t === lowestTotal;
                  return (
                    <td key={`t-${s.id}`} className="p-2 border-l" colSpan={2}>
                      <div className="text-right">
                        TOTAL:
                        <div className={cn(
                          'text-base',
                          isLow ? 'text-emerald-600' : 'text-foreground',
                          s.is_selected && 'underline decoration-amber-400 decoration-2',
                        )}>
                          {fmtEUR(t)}
                        </div>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {t > 0 && lowestTotal > 0 ? fmtPct(1 - lowestTotal / t) : '—'}
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td colSpan={2} className="p-2 border-l bg-muted/30 text-right">
                  TOTAL (s/IVA):
                  <div className="text-base">{fmtEUR(map.dry_budget_total)}</div>
                </td>
                <td className="p-2 bg-muted/30 text-right">
                  <div className="text-[10px] font-normal">VERBA (Ganho / Perda):</div>
                  <div className={cn(
                    'text-base',
                    map.gain_loss_value >= 0 ? 'text-emerald-600' : 'text-destructive',
                  )}>
                    {fmtEUR(map.gain_loss_value)}
                  </div>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    {fmtPct(map.gain_loss_percentage)}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Condições por fornecedor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {suppliers.map((s) => (
          <Card key={`cond-${s.id}`} className={cn('rounded-xl', s.is_selected && 'ring-2 ring-amber-400')}>
            <CardContent className="p-3 space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                {s.is_selected && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                {s.supplier_name_snapshot || '—'} — Condições
              </div>
              <LabeledInput label="C. Pagamento" defaultValue={s.payment_terms ?? ''} onSave={(v) => patchSup(s.id, { payment_terms: v })} />
              <LabeledInput label="Retenção" defaultValue={s.retention ?? ''} onSave={(v) => patchSup(s.id, { retention: v })} />
              <LabeledInput label="NIF" defaultValue={s.nif ?? ''} onSave={(v) => patchSup(s.id, { nif: v })} />
              <LabeledInput label="Alvará nº" defaultValue={s.license_number ?? ''} onSave={(v) => patchSup(s.id, { license_number: v })} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requisitos + Observações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-3 space-y-2">
            <div className="font-semibold text-sm">Requisitos Técnicos e/ou de Qualidade Exigidos</div>
            <Textarea
              defaultValue={map.technical_requirements ?? ''}
              className="text-xs min-h-[120px]"
              onBlur={(e) => { if (e.target.value !== map.technical_requirements) patchMap({ technical_requirements: e.target.value }); }}
            />
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 space-y-2">
            <div className="font-semibold text-sm">Observações</div>
            <Textarea
              defaultValue={map.observations ?? ''}
              className="text-xs min-h-[120px]"
              onBlur={(e) => { if (e.target.value !== map.observations) patchMap({ observations: e.target.value }); }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="text-[10px] text-muted-foreground text-center pt-4">Mod. 03-1 · 1/1</div>
    </div>
  );
}

function HeaderField({
  label, defaultValue, onSave, colSpan = 1,
}: { label: string; defaultValue: string; onSave: (v: string) => void; colSpan?: number }) {
  return (
    <div className={`col-span-${colSpan}`}>
      <label className="text-[10px] uppercase text-muted-foreground">{label}</label>
      <Input
        defaultValue={defaultValue}
        className="h-8 text-xs"
        onBlur={(e) => { if (e.target.value !== defaultValue) onSave(e.target.value); }}
      />
    </div>
  );
}

function DateField({
  label, value, onSave,
}: { label: string; value: string | null; onSave: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-muted-foreground">{label}</label>
      <Input
        type="date"
        defaultValue={value ?? ''}
        className="h-8 text-xs"
        onBlur={(e) => { if (e.target.value !== (value ?? '')) onSave(e.target.value); }}
      />
    </div>
  );
}

function LabeledInput({
  label, defaultValue, onSave,
}: { label: string; defaultValue: string; onSave: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-muted-foreground">{label}</label>
      <Input
        defaultValue={defaultValue}
        className="h-8 text-xs"
        onBlur={(e) => { if (e.target.value !== defaultValue) onSave(e.target.value); }}
      />
    </div>
  );
}

function SupplierRow({
  label, suppliers, field, patch,
}: {
  label: string;
  suppliers: MceSupplier[];
  field: 'contact_person' | 'phone' | 'email';
  patch: (id: string, p: Partial<MceSupplier>) => void;
}) {
  return (
    <tr className="border-t bg-background">
      <td colSpan={2} className="p-2 text-xs text-muted-foreground">{label}</td>
      {suppliers.map((s) => (
        <td key={`${field}-${s.id}`} className="p-1 border-l" colSpan={2}>
          <Input
            defaultValue={(s[field] as string) ?? ''}
            className="h-7 text-xs"
            onBlur={(e) => {
              if (e.target.value !== ((s[field] as string) ?? ''))
                patch(s.id, { [field]: e.target.value } as Partial<MceSupplier>);
            }}
          />
        </td>
      ))}
      <td colSpan={3} className="border-l bg-muted/10" />
    </tr>
  );
}
