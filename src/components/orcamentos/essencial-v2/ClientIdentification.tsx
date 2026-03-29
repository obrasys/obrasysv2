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
import { FileText, FileStack, Loader2, Send, Eye } from 'lucide-react';
import { type BudgetClientInfo } from '@/types/orcamento-essencial';

export type BudgetFormat = 'tecnico' | 'comercial';

interface Props {
  data: BudgetClientInfo;
  onChange: (data: BudgetClientInfo) => void;
  onSave: (format: BudgetFormat) => void;
  onPreview: (format: BudgetFormat) => void;
  isLoading?: boolean;
  isPreviewLoading?: boolean;
}

export function ClientIdentification({ data, onChange, onSave, onPreview, isLoading, isPreviewLoading }: Props) {
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<BudgetFormat>('tecnico');

  const update = (field: keyof BudgetClientInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleConfirmSend = () => {
    setShowFormatDialog(false);
    onSave(selectedFormat);
  };

  const busy = isLoading || isPreviewLoading;

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
            <Label className="text-sm text-muted-foreground">Nome do Cliente <span className="text-destructive">*</span></Label>
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

      {/* Preview buttons */}
      <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/40">
        <p className="text-sm font-medium text-foreground mb-3">Pré-visualizar antes de guardar</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onPreview('tecnico')}
            disabled={busy}
          >
            {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            <FileStack className="h-3.5 w-3.5" />
            Ver Técnico
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onPreview('comercial')}
            disabled={busy}
          >
            {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            <FileText className="h-3.5 w-3.5" />
            Ver Comercial
          </Button>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2" onClick={() => setShowFormatDialog(true)} disabled={busy}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Guardar & Enviar
        </Button>
      </div>

      {/* Format selection dialog */}
      <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Formato do orçamento
            </DialogTitle>
            <DialogDescription>
              Escolha o formato do documento antes de guardar.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as BudgetFormat)} className="grid grid-cols-2 gap-3 py-2">
            <label
              className={`flex items-center gap-2.5 rounded-lg border p-4 cursor-pointer transition-all ${selectedFormat === 'tecnico' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
            >
              <RadioGroupItem value="tecnico" />
              <div>
                <div className="flex items-center gap-1.5">
                  <FileStack className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Técnico</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Capítulos, artigos, quantidades e preços unitários</p>
              </div>
            </label>
            <label
              className={`flex items-center gap-2.5 rounded-lg border p-4 cursor-pointer transition-all ${selectedFormat === 'comercial' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
            >
              <RadioGroupItem value="comercial" />
              <div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Comercial</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Resumo narrativo, sem detalhe técnico</p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormatDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmSend} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
