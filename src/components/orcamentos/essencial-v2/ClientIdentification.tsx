import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, FileStack, Loader2, Send } from 'lucide-react';
import { type BudgetClientInfo } from '@/types/orcamento-essencial';

export type BudgetFormat = 'tecnico' | 'comercial';

interface Props {
  data: BudgetClientInfo;
  onChange: (data: BudgetClientInfo) => void;
  onSave: (format: BudgetFormat) => void;
  isLoading?: boolean;
}

export function ClientIdentification({ data, onChange, onSave, isLoading }: Props) {
  const update = (field: keyof BudgetClientInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-6">Identificação & Cliente/Obra</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Nº Orçamento</Label>
            <Input
              value={data.budgetNumber}
              onChange={(e) => update('budgetNumber', e.target.value)}
              className="h-11 mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={data.date}
                onChange={(e) => update('date', e.target.value)}
                className="h-11 mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Validade</Label>
              <Input
                type="date"
                value={data.validUntil}
                onChange={(e) => update('validUntil', e.target.value)}
                className="h-11 mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Início Previsto</Label>
              <Input
                type="date"
                value={data.expectedStart}
                onChange={(e) => update('expectedStart', e.target.value)}
                className="h-11 mt-1"
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Nome do Cliente</Label>
            <Input
              placeholder="Ex.: João Silva"
              value={data.clientName}
              onChange={(e) => update('clientName', e.target.value)}
              className="h-11 mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Local da Obra</Label>
            <Input
              placeholder="Morada / Localidade"
              value={data.workLocation}
              onChange={(e) => update('workLocation', e.target.value)}
              className="h-11 mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Condições</Label>
            <Textarea
              placeholder="Ex.: 40% adjudicação, 40% a meio, 20% no fim"
              value={data.conditions}
              onChange={(e) => update('conditions', e.target.value)}
              className="mt-1 min-h-[80px] resize-y"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2" onClick={onSave} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Guardar & Ver PDF
        </Button>
      </div>
    </div>
  );
}
