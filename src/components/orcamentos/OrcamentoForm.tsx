import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useObras } from '@/hooks/useOrcamentos';
import { useClientes } from '@/hooks/useClientes';
import { FiscalContextSection } from '@/components/orcamentos/FiscalContextSection';
import type { OrcamentoFormData, CustosIndiretos } from '@/types/orcamentos';
import { REGIME_EMPREITADA_OPTIONS, TIPO_OBRA_OPTIONS } from '@/types/orcamentos';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText } from 'lucide-react';
import { Loader2, Building2, User, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  obra_id: z.string().optional(),
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  margem_lucro: z.number().min(0).max(99.99, 'Margem deve ser inferior a 100%'),
  custos_indiretos: z.object({
    estaleiro: z.number().min(0),
    seguros: z.number().min(0),
    licenciamento: z.number().min(0),
  }),
  tipo_obra: z.string().optional(),
  tipo_cliente: z.string().optional(),
  tipo_operacao: z.string().optional(),
  project_metadata: z.object({
    nome_obra: z.string().optional(),
    numero_lote: z.string().optional(),
    designacao: z.string().optional(),
    dono_obra: z.string().optional(),
    regime_empreitada: z.string().optional(),
    tipo_obra: z.string().optional(),
    localizacao: z.string().optional(),
    prazo_meses: z.number().optional(),
    numero_fracoes: z.number().optional(),
    projeto_arquitectura: z.string().optional(),
    projeto_engenharia: z.string().optional(),
    responsavel_orcamento: z.string().optional(),
  }).optional(),
});

// Draft only requires title
const draftSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
});

interface OrcamentoFormProps {
  defaultValues?: Partial<OrcamentoFormData>;
  onSubmit: (data: OrcamentoFormData) => void;
  onSaveDraft?: (data: OrcamentoFormData) => void;
  onImportPlanta?: (data: OrcamentoFormData) => void;
  isLoading?: boolean;
  isSavingDraft?: boolean;
  submitLabel?: string;
}

export function OrcamentoForm({
  defaultValues,
  onSubmit,
  onSaveDraft,
  onImportPlanta,
  isLoading,
  isSavingDraft,
  submitLabel = 'Criar Orçamento',
}: OrcamentoFormProps) {
  const { obras, isLoading: loadingObras } = useObras();
  const { clientesAtivos, isLoading: loadingClientes } = useClientes();

  const form = useForm<OrcamentoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: '',
      obra_id: undefined,
      cliente_id: undefined,
      margem_lucro: 15,
      custos_indiretos: {
        estaleiro: 0,
        seguros: 0,
        licenciamento: 0,
      },
      tipo_obra: undefined,
      tipo_cliente: undefined,
      tipo_operacao: undefined,
      project_metadata: {},
      ...defaultValues,
    },
  });

  const selectedClienteId = form.watch('cliente_id');
  const selectedCliente = clientesAtivos?.find(c => c.id === selectedClienteId);

  // Validate client completeness
  const clientMissingFields: string[] = [];
  if (selectedCliente) {
    if (!selectedCliente.email) clientMissingFields.push('email');
    if (!selectedCliente.telefone && !selectedCliente.telemovel) clientMissingFields.push('telefone');
    if (!selectedCliente.endereco) clientMissingFields.push('morada');
  }
  const isClientComplete = selectedCliente && clientMissingFields.length === 0;

  const handleSubmit = (data: OrcamentoFormData) => {
    if (!isClientComplete) {
      form.setError('cliente_id', { 
        message: `Cliente incompleto: falta ${clientMissingFields.join(', ')}. Edite o cliente primeiro.` 
      });
      return;
    }
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do Orçamento</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Remodelação Apartamento T3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Cliente <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : clientesAtivos && clientesAtivos.length > 0 ? (
                    clientesAtivos.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {cliente.nome}
                          {cliente.empresa && (
                            <span className="text-muted-foreground">({cliente.empresa})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado. Crie um cliente primeiro.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
              {/* Client completeness indicator */}
              {selectedCliente && (
                <div className="mt-2">
                  {isClientComplete ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Cliente completo
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">Dados em falta:</span> {clientMissingFields.join(', ')}.
                        <br />
                        <a href={`/clientes/${selectedCliente.id}/editar`} className="underline font-medium">
                          Editar cliente
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="obra_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Obra Associada (opcional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar obra..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover">
                  {loadingObras ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : obras && obras.length > 0 ? (
                    obras.map((obra) => (
                      <SelectItem key={obra.id} value={obra.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {obra.nome}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhuma obra encontrada
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="margem_lucro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Margem de Lucro: {field.value}%</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={50}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="py-4"
                />
              </FormControl>
              <FormDescription className="text-xs" title="Margem é calculada sobre o preço de venda final. Ex: 30% de margem sobre custo de 100 € = preço de venda de 142,86 €.">
                Margem sobre o preço de venda final. Não confundir com markup sobre o custo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FiscalContextSection form={form} />

        {/* Ficha Técnica da Obra - Opcional */}
        <Collapsible className="border rounded-lg">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
            <div className="flex items-center gap-2 text-left">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <h4 className="font-medium text-sm">Dados da Obra (Ficha Técnica)</h4>
                <p className="text-xs text-muted-foreground">
                  Opcional - preenche automaticamente a Folha de Fecho e o PDF comercial
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="project_metadata.nome_obra" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Nome da Obra</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.numero_lote" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Nº / Lote Obra</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.designacao" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Designação</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.dono_obra" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Dono de Obra</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.regime_empreitada" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wide">Regime Empreitada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                    <SelectContent className="bg-popover">
                      {REGIME_EMPREITADA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.tipo_obra" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wide">Tipo de Obra</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                    <SelectContent className="bg-popover">
                      {TIPO_OBRA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.localizacao" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Localização</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.prazo_meses" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Prazo (meses)</FormLabel><FormControl><Input type="number" min={0} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.numero_fracoes" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Nº Frações</FormLabel><FormControl><Input type="number" min={0} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.projeto_arquitectura" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Projecto Arquitectura</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.projeto_engenharia" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Projecto Engenharia</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="project_metadata.responsavel_orcamento" render={({ field }) => (
                <FormItem><FormLabel className="text-xs uppercase tracking-wide">Responsável Orçamento</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-4">
          <h4 className="font-medium text-sm">Custos Indiretos</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="custos_indiretos.estaleiro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estaleiro (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="custos_indiretos.seguros"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seguros (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="custos_indiretos.licenciamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Licenciamento (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex gap-3">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSavingDraft || isLoading}
              onClick={() => {
                const values = form.getValues();
                if (values.titulo) {
                  onSaveDraft(values);
                } else {
                  form.setError('titulo', { message: 'Título é obrigatório' });
                }
              }}
            >
              {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Rascunho
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isLoading || isSavingDraft}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
