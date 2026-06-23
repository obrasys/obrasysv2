import { useState, useEffect, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FileText, FileStack, Loader2, Send, Eye, Layers, Users, Check } from 'lucide-react';
import { type BudgetClientInfo, type ExportGrouping } from '@/types/orcamento-essencial';
import { supabase } from '@/integrations/supabase/client';

export type BudgetFormat = 'tecnico' | 'comercial' | 'zonas';

interface Props {
  data: BudgetClientInfo;
  onChange: (data: BudgetClientInfo) => void;
  onSave: (format: BudgetFormat) => void;
  onPreview: (format: BudgetFormat) => void;
  isLoading?: boolean;
  isPreviewLoading?: boolean;
  grouping: ExportGrouping;
  onGroupingChange: (g: ExportGrouping) => void;
}

export function ClientIdentification({ data, onChange, onSave, onPreview, isLoading, isPreviewLoading, grouping, onGroupingChange }: Props) {
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<BudgetFormat>('tecnico');
  const [clientesOpen, setClientesOpen] = useState(false);
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; empresa: string | null }>>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');

  useEffect(() => {
    if (!clientesOpen || clientes.length > 0) return;
    setLoadingClientes(true);
    supabase
      .from('clientes')
      .select('id,nome,email,telefone,endereco,cidade,empresa')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        setClientes(data ?? []);
        setLoadingClientes(false);
      });
  }, [clientesOpen, clientes.length]);

  const filteredClientes = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.nome, c.empresa, c.email, c.telefone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clientes, clienteSearch]);

  const update = (field: keyof BudgetClientInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleSelectCliente = (c: typeof clientes[number]) => {
    const local = [c.endereco, c.cidade].filter(Boolean).join(', ');
    onChange({
      ...data,
      clientName: c.empresa ? `${c.nome} (${c.empresa})` : c.nome,
      workLocation: data.workLocation || local,
    });
    setClientesOpen(false);
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
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm text-muted-foreground">Nome do Cliente <span className="text-destructive">*</span></Label>
              <Popover open={clientesOpen} onOpenChange={setClientesOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-primary hover:text-primary">
                    <Users className="h-3.5 w-3.5" />
                    Buscar da base
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Pesquisar cliente..." value={clienteSearch} onValueChange={setClienteSearch} />
                    <CommandList>
                      {loadingClientes && (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
                        </div>
                      )}
                      {!loadingClientes && filteredClientes.length === 0 && (
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      )}
                      <CommandGroup>
                        {filteredClientes.map((c) => (
                          <CommandItem key={c.id} value={c.id} onSelect={() => handleSelectCliente(c)} className="flex flex-col items-start gap-0.5">
                            <div className="flex items-center gap-2 w-full">
                              <Check className={`h-3.5 w-3.5 ${data.clientName.includes(c.nome) ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                              <span className="font-medium">{c.nome}</span>
                              {c.empresa && <span className="text-xs text-muted-foreground">· {c.empresa}</span>}
                            </div>
                            {(c.email || c.telefone) && (
                              <span className="text-[11px] text-muted-foreground pl-5">
                                {[c.email, c.telefone].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              placeholder="Ex.: João Silva"
              value={data.clientName}
              onChange={(e) => update('clientName', e.target.value)}
              className="h-11"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Local da Obra <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Morada / Localidade"
              value={data.workLocation}
              onChange={(e) => update('workLocation', e.target.value)}
              className="h-11 mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Condições <span className="text-destructive">*</span></Label>
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onPreview('zonas')}
            disabled={busy}
          >
            {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            <Layers className="h-3.5 w-3.5" />
            Ver Por Zonas
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

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Layers className="h-4 w-4 text-primary" />
              Agrupamento no PDF / Excel
            </div>
            <RadioGroup value={grouping} onValueChange={(v) => onGroupingChange(v as ExportGrouping)} className="grid grid-cols-1 gap-1.5">
              <label className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer text-xs ${grouping === 'chapter' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="chapter" />
                <span><strong>Por capítulos</strong> — formato clássico</span>
              </label>
              <label className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer text-xs ${grouping === 'chapter_zone' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="chapter_zone" />
                <span><strong>Por capítulos e zonas</strong> — agrupa serviços por zona</span>
              </label>
              <label className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer text-xs ${grouping === 'chapter_zone_area' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="chapter_zone_area" />
                <span><strong>Por capítulos, zonas e áreas</strong> — máximo detalhe</span>
              </label>
            </RadioGroup>
          </div>

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
